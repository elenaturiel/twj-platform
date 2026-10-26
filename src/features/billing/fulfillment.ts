import "server-only";
import { billingPeriod } from "@/domain/billing/renewal";
import type { BillingInterval } from "@/domain/billing/types";
import { todayInMadrid } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeSquad } from "./squads.server";

export type PaymentInput = {
  subscriptionId: string;
  method: "stripe" | "bizum" | "transfer" | "cash" | "other";
  amountCents: number;
  discountCents?: number;
  paidAt?: string;
  /** Si no se indica, se calcula a partir del fin del periodo anterior (o de hoy) */
  periodStart?: string;
  periodEnd?: string;
  recordedBy?: string | null;
  notes?: string | null;
  stripe?: {
    invoiceId?: string | null;
    paymentIntentId?: string | null;
    checkoutSessionId?: string | null;
    subscriptionId?: string | null;
  };
};

/**
 * Registra un cobro de cuota (Stripe o manual) y deja la suscripción al día.
 * Es idempotente por factura/sesión de Stripe. Si es el primer cobro, activa
 * al cliente, confirma descuentos, manda la bienvenida y avisa a Jaime.
 */
export async function applySubscriptionPayment(input: PaymentInput, siteUrl: string) {
  const admin = createAdminClient();

  if (input.stripe?.invoiceId) {
    const { data: dup } = await admin
      .from("payments")
      .select("id")
      .eq("stripe_invoice_id", input.stripe.invoiceId)
      .maybeSingle();
    if (dup) return { paymentId: dup.id, duplicated: true as const };
  }

  const { data: sub, error } = await admin
    .from("subscriptions")
    .select("*, plans(key, name), clients(id, status, started_at, profile_id, profiles(email, full_name))")
    .eq("id", input.subscriptionId)
    .single();
  if (error || !sub) throw new Error(`Suscripción ${input.subscriptionId} no encontrada`);

  const isFirst = sub.status === "pending_payment";
  const interval = sub.billing_interval as BillingInterval;
  const today = todayInMadrid();
  const start = input.periodStart ?? (isFirst ? today : (sub.current_period_end ?? today));
  const period = input.periodEnd
    ? { start, end: input.periodEnd }
    : billingPeriod(start, interval, sub.anchor_day ?? undefined);

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      client_id: sub.client_id,
      subscription_id: sub.id,
      kind: "subscription",
      method: input.method,
      status: "paid",
      amount_cents: input.amountCents,
      discount_cents: input.discountCents ?? Math.max(sub.list_price_cents - input.amountCents, 0),
      paid_at: input.paidAt ?? new Date().toISOString(),
      period_start: period.start,
      period_end: period.end,
      description: `Cuota ${sub.plans?.name ?? ""} ${period.start} → ${period.end}`,
      recorded_by: input.recordedBy ?? null,
      notes: input.notes ?? null,
      stripe_invoice_id: input.stripe?.invoiceId ?? null,
      stripe_payment_intent_id: input.stripe?.paymentIntentId ?? null,
    })
    .select("id")
    .single();
  if (payErr) {
    // Carrera entre dos webhooks iguales: la restricción unique lo resuelve
    if (payErr.code === "23505") return { paymentId: null, duplicated: true as const };
    throw new Error(payErr.message);
  }

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: period.start,
      current_period_end: period.end,
      grace_until: null,
      anchor_day: sub.anchor_day ?? Number(period.start.slice(8, 10)),
      started_at: sub.started_at ?? new Date().toISOString(),
      stripe_subscription_id: input.stripe?.subscriptionId ?? sub.stripe_subscription_id,
    })
    .eq("id", sub.id);

  await admin
    .from("clients")
    .update({
      status: "active",
      plan_id: sub.plan_id,
      billing_mode: sub.billing_mode,
      billing_interval: sub.billing_interval,
      started_at: sub.clients?.started_at ?? today,
      cancelled_at: null,
    })
    .eq("id", sub.client_id);

  if (isFirst) {
    await admin
      .from("discount_redemptions")
      .update({ status: "applied", applied_at: new Date().toISOString(), reserved_until: null })
      .eq("subscription_id", sub.id)
      .eq("status", "reserved");
  }

  await grantPeriodCredits(sub.client_id, period.start);

  // Un nuevo miembro que paga puede subir de tramo a todo su squad
  if (isFirst) {
    const { data: membership } = await admin
      .from("squad_members")
      .select("squad_id")
      .eq("client_id", sub.client_id)
      .is("left_at", null)
      .maybeSingle();
    if (membership) await recomputeSquad(membership.squad_id);
  }

  const name = sub.clients?.profiles?.full_name ?? "";
  if (isFirst) {
    if (sub.clients?.profiles?.email) {
      await sendTemplateEmail({
        to: sub.clients.profiles.email,
        templateKey: "welcome",
        vars: { nombre: name.split(" ")[0] ?? "", plan: sub.plans?.name ?? "", enlace: `${siteUrl}/onboarding` },
        cta: { label: "Rellenar mi ficha", href: `${siteUrl}/onboarding` },
      });
    }
    await admin.rpc("notify_staff", {
      p_type: "new_signup",
      p_title: `Alta nueva: ${name} (${sub.plans?.name ?? ""})`,
      p_body: `Primer pago de ${formatEuros(input.amountCents)} confirmado.`,
      p_link: `/panel/clientes/${sub.client_id}`,
      p_client_id: sub.client_id,
    });
  } else {
    await admin.rpc("notify_staff", {
      p_type: "payment_received",
      p_title: `Pago recibido: ${name}`,
      p_body: `${formatEuros(input.amountCents)} · ${period.start} → ${period.end}`,
      p_link: `/panel/clientes/${sub.client_id}/pagos`,
      p_client_id: sub.client_id,
    });
  }

  return { paymentId: payment.id, isFirst, period };
}

/** Concede los créditos del periodo según el plan (entrenos en directo, videollamada mensual). */
export async function grantPeriodCredits(clientId: string, periodStart: string) {
  const admin = createAdminClient();
  const grants: { type: "live_training" | "monthly_call"; feature: string }[] = [
    { type: "live_training", feature: "live_sessions" },
    { type: "monthly_call", feature: "monthly_call" },
  ];
  for (const g of grants) {
    const { data } = await admin.rpc("feature_for_client", { p_client_id: clientId, p_feature: g.feature });
    const f = data?.[0];
    if (!f?.enabled || !f.limit_value) continue;
    await admin.from("session_credits").upsert(
      {
        client_id: clientId,
        credit_type: g.type,
        delta: f.limit_value,
        reason: "monthly_grant",
        period_start: periodStart,
      },
      { onConflict: "client_id,credit_type,period_start", ignoreDuplicates: true },
    );
  }
}

/** Cobro fallido o cuota vencida: pasa a past_due con periodo de gracia. */
export async function markPastDue(subscriptionId: string, siteUrl: string, reason: "failed" | "overdue") {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, client_id, status, grace_until, current_period_end, clients(profiles(email, full_name))")
    .eq("id", subscriptionId)
    .single();
  if (!sub || sub.status === "past_due" || sub.status === "cancelled") return;

  const { data: setting } = await admin.from("settings").select("value").eq("key", "billing.grace_days").maybeSingle();
  const graceDays = typeof setting?.value === "number" ? setting.value : 5;
  const { addDays } = await import("@/domain/billing/renewal");
  const graceUntil = addDays(
    reason === "overdue" && sub.current_period_end ? sub.current_period_end : todayInMadrid(),
    graceDays,
  );

  await admin.from("subscriptions").update({ status: "past_due", grace_until: graceUntil }).eq("id", sub.id);
  await admin.from("clients").update({ status: "past_due" }).eq("id", sub.client_id);

  const name = sub.clients?.profiles?.full_name ?? "";
  if (reason === "failed" && sub.clients?.profiles?.email) {
    await sendTemplateEmail({
      to: sub.clients.profiles.email,
      templateKey: "payment_failed",
      vars: { nombre: name.split(" ")[0] ?? "", enlace: `${siteUrl}/perfil/plan`, fecha: graceUntil },
      cta: { label: "Actualizar pago", href: `${siteUrl}/perfil/plan` },
    });
  }
  await admin.rpc("notify_staff", {
    p_type: "payment_failed",
    p_title: reason === "failed" ? `Pago fallido: ${name}` : `Cuota vencida: ${name}`,
    p_body: `Acceso hasta el ${graceUntil}.`,
    p_link: `/panel/clientes/${sub.client_id}/pagos`,
    p_client_id: sub.client_id,
  });
}

export async function cancelSubscription(subscriptionId: string) {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, client_id, status")
    .eq("id", subscriptionId)
    .single();
  if (!sub || sub.status === "cancelled") return;
  const { data: membership } = await admin
    .from("squad_members")
    .select("squad_id")
    .eq("client_id", sub.client_id)
    .is("left_at", null)
    .maybeSingle();
  // El trigger on_subscription_cancelled revoca el fundador y saca al cliente de su squad
  await admin
    .from("subscriptions")
    .update({ status: "cancelled", ended_at: new Date().toISOString() })
    .eq("id", sub.id);
  // Si alguien se da de baja, todo su squad baja de tramo
  if (membership) await recomputeSquad(membership.squad_id);
  await admin
    .from("clients")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", sub.client_id);
  await admin.rpc("notify_staff", {
    p_type: "client_cancelled",
    p_title: "Baja de un cliente",
    p_link: `/panel/clientes/${sub.client_id}`,
    p_client_id: sub.client_id,
  });
}
