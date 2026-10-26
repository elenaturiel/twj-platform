"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/dal";
import { getStripe, paymentsMode } from "@/lib/payments/stripe";
import { requestOrigin } from "@/lib/request";
import { recordConsents } from "@/features/legal/consents.server";
import { buildSignupQuote } from "./quote.server";
import { quoteInputSchema, signupSchema, type QuoteInput } from "./schemas";
import { newSquadCode } from "./squads.server";
import { applySubscriptionPayment } from "./fulfillment";
import { createFirstPeriodCoupon, ensureStripeCustomer, ensureStripePrice } from "./stripe-sync";

export type PublicQuote = {
  planName: string;
  interval: "month" | "year";
  listCents: number;
  totalCents: number;
  monthlyEquivalentCents: number;
  lines: { label: string; amountCents: number; percent?: number }[];
  squadCodeStatus: "none" | "ok" | "invalid";
  squadFriends: number;
  promoCodeStatus: "none" | "applied" | "invalid";
  founderSlotsLeft: number;
};

/** Presupuesto en vivo para /empezar (público). */
export async function previewQuote(input: QuoteInput): Promise<PublicQuote | { error: string }> {
  const parsed = quoteInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos no válidos" };
  const res = await buildSignupQuote(parsed.data);
  if ("error" in res) return res;
  return {
    planName: res.plan.name,
    interval: res.quote.interval,
    listCents: res.quote.listCents,
    totalCents: res.quote.totalCents,
    monthlyEquivalentCents: res.quote.monthlyEquivalentCents,
    lines: res.quote.lines.map((l) => ({ label: l.label, amountCents: l.amountCents, percent: l.percent })),
    squadCodeStatus: res.squadCodeStatus,
    squadFriends: res.squad?.friends ?? 0,
    promoCodeStatus: res.promoCodeStatus,
    founderSlotsLeft: res.founderSlotsLeft,
  };
}

export type SignupState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

function referralCode(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return `TWJ-${base || "AMIGO"}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

/**
 * Alta: crea (o reutiliza) cuenta + cliente + suscripción pendiente, reserva
 * descuentos y manda al checkout. El acceso llega cuando se confirma el pago.
 */
export async function startSignup(_: SignupState, formData: FormData): Promise<SignupState> {
  const raw = Object.fromEntries(formData);
  const parsed = signupSchema.safeParse({
    ...raw,
    studentClaim: raw.studentClaim === "on",
    acceptTerms: raw.acceptTerms === "on",
    acceptHealth: raw.acceptHealth === "on",
    acceptPhotos: raw.acceptPhotos === "on",
    acceptMarketing: raw.acceptMarketing === "on",
    fullName: raw.fullName || undefined,
    email: raw.email || undefined,
    password: raw.password || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Revisa los campos marcados.", fieldErrors };
  }
  const input = parsed.data;
  const origin = await requestOrigin();
  const admin = createAdminClient();

  // ── 1. Cuenta ──────────────────────────────────────────────────────────────
  let viewer = await getViewer();
  if (viewer && viewer.role !== "client")
    return { error: "Estás con una cuenta del equipo. Cierra sesión para dar de alta a un cliente." };
  let profileId = viewer?.id;
  let fullName = viewer?.fullName || input.fullName || "";
  let email = viewer?.email;

  if (!profileId) {
    if (!input.email || !input.password || !input.fullName) {
      return {
        error: "Faltan datos de la cuenta.",
        fieldErrors: {
          ...(!input.fullName && { fullName: "Pon tu nombre" }),
          ...(!input.email && { email: "Pon tu email" }),
          ...(!input.password && { password: "Elige una contraseña" }),
        },
      };
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName }, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
    });
    // Supabase no revela si el email existe: identities vacío = ya registrado
    if (error || !data.user || data.user.identities?.length === 0) {
      return { error: "Ya hay una cuenta con ese email. Entra y vuelve a esta página para terminar el alta." };
    }
    profileId = data.user.id;
    email = input.email;
    fullName = input.fullName;
    viewer = null;
  }
  if (!profileId || !email) return { error: "No hemos podido crear tu cuenta." };

  if (fullName) await admin.from("profiles").update({ full_name: fullName }).eq("id", profileId);

  // ── 2. Cliente ─────────────────────────────────────────────────────────────
  let { data: client } = await admin
    .from("clients")
    .select("id, status, stripe_customer_id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (client && ["active", "past_due", "paused"].includes(client.status)) redirect("/hoy");

  const quoteRes = await buildSignupQuote(input, client?.id ?? null);
  if ("error" in quoteRes) return { error: quoteRes.error };
  if (input.squadMode === "join" && quoteRes.squadCodeStatus !== "ok") {
    return { error: "Ese código de squad no existe.", fieldErrors: { squadCode: "Código no válido" } };
  }

  if (!client) {
    const { data, error } = await admin
      .from("clients")
      .insert({
        profile_id: profileId,
        status: "pending_payment",
        plan_id: quoteRes.plan.id,
        billing_mode: "stripe",
        billing_interval: input.interval,
        referral_code: referralCode(fullName),
      })
      .select("id, status, stripe_customer_id")
      .single();
    if (error) return { error: "No hemos podido preparar tu alta. Prueba otra vez." };
    client = data;
    await admin.from("client_intake").insert({ client_id: client.id });
  } else {
    await admin
      .from("clients")
      .update({ plan_id: quoteRes.plan.id, billing_interval: input.interval, billing_mode: "stripe" })
      .eq("id", client.id);
  }

  await recordConsents(profileId, {
    terms: true,
    privacy: true,
    health_data: true,
    progress_photos: input.acceptPhotos,
    marketing: input.acceptMarketing,
  });

  // ── 3. Squad ───────────────────────────────────────────────────────────────
  if (input.squadMode === "create" || (input.squadMode === "join" && quoteRes.squad)) {
    let squadId = quoteRes.squad?.id;
    if (input.squadMode === "create") {
      const { data: squad } = await admin
        .from("squads")
        .insert({ code: newSquadCode(), owner_client_id: client.id })
        .select("id")
        .single();
      squadId = squad?.id;
    }
    if (squadId) {
      await admin
        .from("squad_members")
        .upsert(
          { squad_id: squadId, client_id: client.id },
          { onConflict: "squad_id,client_id", ignoreDuplicates: true },
        );
      if (input.squadMode === "join") {
        const { data: squad } = await admin.from("squads").select("owner_client_id, code").eq("id", squadId).single();
        if (squad?.owner_client_id && squad.owner_client_id !== client.id) {
          await admin
            .from("referrals")
            .upsert(
              {
                referrer_client_id: squad.owner_client_id,
                referred_client_id: client.id,
                code_used: squad.code,
                squad_id: squadId,
              },
              { onConflict: "referred_client_id", ignoreDuplicates: true },
            );
        }
      }
    }
  }

  // ── 4. Suscripción pendiente (se descarta la anterior si la había) ─────────
  const { data: oldPending } = await admin
    .from("subscriptions")
    .select("id")
    .eq("client_id", client.id)
    .eq("status", "pending_payment");
  for (const old of oldPending ?? []) {
    await admin
      .from("discount_redemptions")
      .update({ status: "expired" })
      .eq("subscription_id", old.id)
      .eq("status", "reserved");
    await admin.from("subscriptions").delete().eq("id", old.id);
  }

  const q = quoteRes.quote;
  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .insert({
      client_id: client.id,
      plan_id: quoteRes.plan.id,
      billing_mode: "stripe",
      billing_interval: input.interval,
      status: "pending_payment",
      list_price_cents: q.listCents,
      amount_cents: q.totalCents,
      discount_breakdown: q.lines.map((l) => ({
        kind: l.kind,
        label: l.label,
        amount_cents: l.amountCents,
        percent: l.percent ?? null,
      })),
    })
    .select("id")
    .single();
  if (subErr || !sub) return { error: "No hemos podido preparar tu suscripción." };

  // Reservas: el fundador con bloqueo (sin carreras); el resto, reserva normal
  const minutes = 30;
  for (const line of q.lines) {
    if (line.kind === "founder") {
      const { data: reservation } = await admin.rpc("reserve_founder_slot", {
        p_client_id: client.id,
        p_subscription_id: sub.id,
        p_minutes: minutes,
      });
      if (!reservation) {
        await admin.from("subscriptions").delete().eq("id", sub.id);
        return { error: "Se acaban de agotar las plazas de precio fundador. Recarga para ver el precio actualizado." };
      }
    } else {
      await admin.from("discount_redemptions").insert({
        discount_id: line.discountId,
        client_id: client.id,
        subscription_id: sub.id,
        status: "reserved",
        reserved_until: new Date(Date.now() + minutes * 60_000).toISOString(),
        snapshot: {
          amount_cents: line.amountCents,
          percent: line.percent ?? null,
          pending_verification: line.kind === "student",
        },
      });
    }
  }

  // ── 5. Checkout ────────────────────────────────────────────────────────────
  const mode = paymentsMode();
  let url: string;
  if (mode === "mock") {
    const sessionId = `mock_${randomUUID()}`;
    await admin.from("subscriptions").update({ checkout_session_id: sessionId }).eq("id", sub.id);
    url = `/empezar/pago-simulado?session=${sessionId}`;
  } else {
    const stripe = getStripe()!;
    const { data: planRow } = await admin
      .from("plans")
      .select("id, key, name, stripe_product_id")
      .eq("id", quoteRes.plan.id)
      .single();
    const priceId = await ensureStripePrice(stripe, admin, planRow!, input.interval, q.listCents);
    const customerId = await ensureStripeCustomer(stripe, admin, client, { email, full_name: fullName });
    const couponId = await createFirstPeriodCoupon(
      stripe,
      sub.id,
      q.discountCents,
      q.lines.map((l) => l.label).join(" + ") || "Descuento TWJ",
    );
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
      locale: "es",
      client_reference_id: client.id,
      metadata: { subscription_id: sub.id, client_id: client.id },
      subscription_data: { metadata: { subscription_id: sub.id, client_id: client.id } },
      success_url: `${origin}/empezar/confirmando?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/empezar?plan=${quoteRes.plan.key}&cancelado=1`,
      expires_at: Math.floor(Date.now() / 1000) + minutes * 60,
    });
    await admin.from("subscriptions").update({ checkout_session_id: session.id }).eq("id", sub.id);
    url = session.url!;
  }
  redirect(url);
}

/** Simulador local: confirma el "pago" como haría el webhook de Stripe. */
export async function completeMockCheckout(formData: FormData) {
  if (paymentsMode() !== "mock") throw new Error("El simulador de pagos no está activo");
  const session = String(formData.get("session") ?? "");
  const outcome = String(formData.get("outcome") ?? "paid");
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, amount_cents, list_price_cents, status")
    .eq("checkout_session_id", session)
    .maybeSingle();
  if (!sub) redirect("/empezar?error=sesion");
  if (outcome === "paid" && sub.status === "pending_payment") {
    await applySubscriptionPayment(
      {
        subscriptionId: sub.id,
        method: "stripe",
        amountCents: sub.amount_cents,
        discountCents: sub.list_price_cents - sub.amount_cents,
        stripe: { checkoutSessionId: session, invoiceId: `mock_inv_${session}` },
      },
      await requestOrigin(),
    );
    redirect(`/empezar/confirmando?session=${session}`);
  }
  redirect(`/empezar?cancelado=1`);
}

/** Estado del alta para la pantalla de "confirmando pago". */
export async function signupStatus(): Promise<"active" | "pending" | "none"> {
  const viewer = await getViewer();
  if (!viewer) return "none";
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("status").eq("profile_id", viewer.id).maybeSingle();
  if (!data) return "none";
  return data.status === "active" ? "active" : "pending";
}
