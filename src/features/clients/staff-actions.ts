"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/payments/stripe";
import { requestOrigin } from "@/lib/request";
import { sendEmail } from "@/lib/email/send";
import { todayInMadrid } from "@/lib/dates";
import { nextManualPeriod } from "@/domain/billing/renewal";
import type { BillingInterval } from "@/domain/billing/types";
import { applySubscriptionPayment } from "@/features/billing/fulfillment";
import { recomputeClientSubscription } from "@/features/billing/squads.server";
import { ensureStripeCustomer, ensureStripePrice } from "@/features/billing/stripe-sync";
import { buildSignupQuote } from "@/features/billing/quote.server";

export type StaffResult = { ok: true; message?: string } | { ok: false; error: string };

const newClientSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  planKey: z.string(),
  interval: z.enum(["month", "year"]),
  billingMode: z.enum(["manual", "stripe"]),
  // Importe pactado por periodo (obligatorio en Peak, que no tiene precio de lista)
  customAmountEuros: z.coerce.number().min(0).max(5000).optional(),
  studentClaim: z.boolean().default(false),
  modalities: z.array(z.enum(["gym", "functional", "running", "hyrox"])).default([]),
});

/**
 * Alta hecha por Jaime/Elena (clientes de hoy, que pagan por Bizum/transferencia).
 * Crea la cuenta por invitación y deja la suscripción pendiente hasta el primer pago.
 */
export async function createClientByStaff(
  input: z.input<typeof newClientSchema>,
): Promise<StaffResult & { clientId?: string }> {
  const viewer = await requireScope("clients");
  const parsed = newClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del cliente." };
  const d = parsed.data;
  const admin = createAdminClient();
  const origin = await requestOrigin();

  const { data: plan } = await admin
    .from("plans")
    .select("id, key, name, price_cents, requires_application")
    .eq("key", d.planKey)
    .single();
  if (!plan) return { ok: false, error: "Plan no encontrado." };
  if (plan.price_cents === null && d.customAmountEuros === undefined)
    return { ok: false, error: "Indica el importe pactado." };

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(d.email, {
    data: { full_name: d.fullName },
    redirectTo: `${origin}/auth/callback?next=/auth/nueva-contrasena`,
  });
  if (inviteErr || !invited.user) {
    return {
      ok: false,
      error: inviteErr?.message.includes("already")
        ? "Ya existe una cuenta con ese email."
        : "No se ha podido invitar.",
    };
  }

  const { data: client, error } = await admin
    .from("clients")
    .insert({
      profile_id: invited.user.id,
      status: "pending_payment",
      plan_id: plan.id,
      billing_mode: d.billingMode,
      billing_interval: d.interval,
      modalities: d.modalities,
      referral_code: `TWJ-${randomUUID().slice(0, 6).toUpperCase()}`,
    })
    .select("id")
    .single();
  if (error || !client) return { ok: false, error: "No se ha podido crear el cliente." };
  await admin.from("client_intake").insert({ client_id: client.id });

  // Importe: precio de lista con descuentos automáticos (o el pactado)
  let listCents: number;
  let amountCents: number;
  let breakdown: unknown[] = [];
  if (d.customAmountEuros !== undefined) {
    amountCents = Math.round(d.customAmountEuros * 100);
    listCents = plan.price_cents !== null ? plan.price_cents * (d.interval === "year" ? 12 : 1) : amountCents;
    if (listCents > amountCents)
      breakdown = [{ kind: "custom", label: "Precio pactado", amount_cents: listCents - amountCents, percent: null }];
  } else {
    const q = await buildSignupQuote(
      { planKey: plan.key, interval: d.interval, studentClaim: d.studentClaim },
      client.id,
    );
    if ("error" in q) return { ok: false, error: q.error };
    listCents = q.quote.listCents;
    amountCents = q.quote.totalCents;
    breakdown = q.quote.lines.map((l) => ({
      kind: l.kind,
      label: l.label,
      amount_cents: l.amountCents,
      percent: l.percent ?? null,
    }));
  }

  await admin.from("subscriptions").insert({
    client_id: client.id,
    plan_id: plan.id,
    billing_mode: d.billingMode,
    billing_interval: d.interval,
    status: "pending_payment",
    list_price_cents: listCents,
    amount_cents: amountCents,
    discount_breakdown: breakdown as never,
  });

  await admin.from("audit_log").insert({
    actor_id: viewer.id,
    action: "client_created_by_staff",
    entity: "clients",
    entity_id: client.id,
    client_id: client.id,
    metadata: { plan: plan.key, billing_mode: d.billingMode },
  });

  if (d.billingMode === "stripe") await sendCheckoutLink(client.id);
  revalidatePath("/panel/clientes");
  return { ok: true, clientId: client.id, message: "Cliente creado e invitado por email." };
}

const paymentSchema = z.object({
  subscriptionId: z.uuid(),
  method: z.enum(["bizum", "transfer", "cash", "other"]),
  amountEuros: z.coerce.number().min(0).max(10000),
  paidOn: z.iso.date(),
  periodStart: z.iso.date().optional().or(z.literal("")),
  periodEnd: z.iso.date().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

/** Jaime registra un cobro manual. El primero activa el acceso del cliente. */
export async function registerManualPayment(input: z.input<typeof paymentSchema>): Promise<StaffResult> {
  const viewer = await requireScope("billing");
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del pago." };
  const d = parsed.data;
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, client_id, billing_interval, current_period_end, anchor_day, status")
    .eq("id", d.subscriptionId)
    .single();
  if (!sub) return { ok: false, error: "Suscripción no encontrada." };

  const period =
    d.periodStart && d.periodEnd
      ? { start: d.periodStart, end: d.periodEnd }
      : nextManualPeriod({
          previousEnd: sub.status === "pending_payment" ? null : sub.current_period_end,
          paidOn: d.paidOn,
          interval: sub.billing_interval as BillingInterval,
          anchorDay: sub.anchor_day ?? undefined,
        });
  if (period.end <= period.start) return { ok: false, error: "El periodo no es válido." };

  await applySubscriptionPayment(
    {
      subscriptionId: sub.id,
      method: d.method,
      amountCents: Math.round(d.amountEuros * 100),
      paidAt: new Date(`${d.paidOn}T12:00:00Z`).toISOString(),
      periodStart: period.start,
      periodEnd: period.end,
      recordedBy: viewer.id,
      notes: d.notes || null,
    },
    await requestOrigin(),
  );
  revalidatePath(`/panel/clientes/${sub.client_id}`, "layout");
  return { ok: true, message: `Pago registrado. Cubre ${period.start} → ${period.end}.` };
}

/**
 * Manda al cliente un enlace de Stripe Checkout.
 * - Alta pendiente: cobra ya.
 * - Migración de manual a Stripe: la tarjeta se guarda ahora y el primer cobro
 *   es el día de la próxima renovación (periodo de prueba hasta esa fecha).
 */
export async function sendCheckoutLink(clientId: string): Promise<StaffResult> {
  await requireScope("billing");
  const stripe = getStripe();
  if (!stripe) return { ok: false, error: "Stripe no está configurado todavía (faltan claves)." };
  const admin = createAdminClient();
  const origin = await requestOrigin();

  const { data: client } = await admin
    .from("clients")
    .select("id, stripe_customer_id, profiles(email, full_name)")
    .eq("id", clientId)
    .single();
  const { data: sub } = await admin
    .from("subscriptions")
    .select(
      "id, status, billing_mode, billing_interval, list_price_cents, amount_cents, current_period_end, plans(id, key, name, stripe_product_id)",
    )
    .eq("client_id", clientId)
    .in("status", ["pending_payment", "active", "past_due"])
    .single();
  if (!client?.profiles || !sub?.plans) return { ok: false, error: "No hay suscripción que cobrar." };

  const migration = sub.status !== "pending_payment";
  const customerId = await ensureStripeCustomer(stripe, admin, client, client.profiles);
  const priceId = await ensureStripePrice(
    stripe,
    admin,
    sub.plans,
    sub.billing_interval as BillingInterval,
    sub.list_price_cents,
  );
  const discount = sub.list_price_cents - sub.amount_cents;
  const coupon =
    !migration && discount > 0
      ? (
          await stripe.coupons.create({
            amount_off: discount,
            currency: "eur",
            duration: "once",
            name: "Descuento TWJ",
          })
        ).id
      : null;
  const trialEnd =
    migration && sub.current_period_end && sub.current_period_end > todayInMadrid()
      ? Math.floor(new Date(`${sub.current_period_end}T08:00:00Z`).getTime() / 1000)
      : undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    ...(coupon ? { discounts: [{ coupon }] } : {}),
    locale: "es",
    metadata: { subscription_id: sub.id, client_id: clientId, migration: migration ? "1" : "0" },
    subscription_data: {
      metadata: { subscription_id: sub.id, client_id: clientId, migration: migration ? "1" : "0" },
      ...(trialEnd ? { trial_end: trialEnd } : {}),
    },
    success_url: `${origin}/perfil/plan?stripe=ok`,
    cancel_url: `${origin}/perfil/plan`,
  });
  await admin.from("subscriptions").update({ checkout_session_id: session.id }).eq("id", sub.id);

  await sendEmail({
    to: client.profiles.email,
    subject: migration ? "Activa el pago automático de tu plan" : "Completa el pago de tu plan TWJ",
    preview: "Enlace de pago seguro",
    paragraphs: [
      `Hola ${client.profiles.full_name.split(" ")[0] ?? ""}:`,
      migration
        ? `Te pasamos al pago automático con tarjeta. No se cobra nada hoy: el primer cargo será el día de tu renovación (${sub.current_period_end}).`
        : "Aquí tienes el enlace para pagar tu plan y activar tu acceso.",
    ],
    cta: { label: migration ? "Guardar mi tarjeta" : "Pagar ahora", href: session.url! },
  });
  return { ok: true, message: "Enlace de pago enviado por email." };
}

/** Jaime revisa el carné universitario. Si lo rechaza, se quita el −10 % en la próxima cuota. */
export async function reviewStudentCard(input: {
  verificationId: string;
  approve: boolean;
  reason?: string;
}): Promise<StaffResult> {
  const viewer = await requireScope("billing");
  const admin = createAdminClient();
  const { data: v } = await admin
    .from("student_verifications")
    .select("id, client_id")
    .eq("id", input.verificationId)
    .single();
  if (!v) return { ok: false, error: "No encontrado." };

  // Validez: hasta el final del curso (31 de agosto)
  const today = todayInMadrid();
  const year = Number(today.slice(0, 4)) + (Number(today.slice(5, 7)) >= 9 ? 1 : 0);
  await admin
    .from("student_verifications")
    .update({
      status: input.approve ? "approved" : "rejected",
      reviewed_by: viewer.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: input.approve ? null : (input.reason ?? null),
      valid_until: input.approve ? `${year}-08-31` : null,
    })
    .eq("id", v.id);

  const { data: redemption } = await admin
    .from("discount_redemptions")
    .select("id, snapshot, discounts!inner(kind)")
    .eq("client_id", v.client_id)
    .eq("discounts.kind", "student")
    .in("status", ["applied", "reserved"])
    .maybeSingle();
  if (redemption) {
    if (input.approve) {
      await admin
        .from("discount_redemptions")
        .update({ snapshot: { ...(redemption.snapshot as object), pending_verification: false } })
        .eq("id", redemption.id);
    } else {
      await admin
        .from("discount_redemptions")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", redemption.id);
      await recomputeClientSubscription(v.client_id);
    }
  }
  revalidatePath("/panel/pendientes");
  return { ok: true };
}

/** Enlace firmado (2 min) para ver un archivo privado. Queda registrado en la auditoría. */
export async function signedFileUrl(bucket: "student-cards" | "documents", path: string, clientId: string) {
  await requireScope(bucket === "student-cards" ? "billing" : "clients");
  const supabase = await createClient();
  await supabase.rpc("log_access", { p_entity: bucket, p_entity_id: path, p_client_id: clientId });
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 120);
  if (!data?.signedUrl) return null;
  return data.signedUrl;
}

export async function saveClientNote(clientId: string, body: string): Promise<StaffResult> {
  const viewer = await requireScope("clients");
  if (!body.trim()) return { ok: false, error: "La nota está vacía." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .insert({ client_id: clientId, author_id: viewer.id, body: body.trim() });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath(`/panel/clientes/${clientId}/notas`);
  return { ok: true };
}

export async function deleteClientNote(noteId: string, clientId: string): Promise<StaffResult> {
  await requireScope("clients");
  const supabase = await createClient();
  await supabase.from("client_notes").delete().eq("id", noteId);
  revalidatePath(`/panel/clientes/${clientId}/notas`);
  return { ok: true };
}

const callSchema = z.object({
  clientId: z.uuid(),
  heldAt: z.string().optional(),
  notes: z.string().max(5000).default(""),
  agreedGoals: z.string().max(2000).default(""),
  metricsToTrack: z.string().max(2000).default(""),
  initialBlocks: z.string().max(2000).default(""),
  observations: z.string().max(5000).default(""),
});

/** Ficha de la llamada de onboarding (solo staff). */
export async function saveOnboardingCall(input: z.input<typeof callSchema>): Promise<StaffResult> {
  const viewer = await requireScope("clients");
  const parsed = callSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("onboarding_calls")
    .select("id")
    .eq("client_id", d.clientId)
    .maybeSingle();
  const row = {
    client_id: d.clientId,
    held_at: d.heldAt ? new Date(d.heldAt).toISOString() : null,
    notes: d.notes,
    agreed_goals: d.agreedGoals,
    metrics_to_track: d.metricsToTrack,
    initial_blocks: d.initialBlocks,
    observations: d.observations,
  };
  const { error } = existing
    ? await supabase.from("onboarding_calls").update(row).eq("id", existing.id)
    : await supabase.from("onboarding_calls").insert({ ...row, created_by: viewer.id });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath(`/panel/clientes/${d.clientId}/ficha`);
  return { ok: true };
}

export async function updateClientAdmin(input: {
  clientId: string;
  modalities: string[];
  tags: string[];
}): Promise<StaffResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const modalities = input.modalities.filter((m) => ["gym", "functional", "running", "hyrox"].includes(m));
  const tags = input.tags
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const { error } = await supabase.from("clients").update({ modalities, tags }).eq("id", input.clientId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath(`/panel/clientes/${input.clientId}`, "layout");
  return { ok: true };
}

export async function goToNewClient(clientId: string) {
  redirect(`/panel/clientes/${clientId}`);
}
