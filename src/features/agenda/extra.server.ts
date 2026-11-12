import "server-only";
import { formatEuros } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sesión extra pagada → pago + 1 crédito "extra" que caduca a los N meses (ajuste
 * agenda.extra_credit_months). Idempotente por `reference` (id del Checkout).
 */
export async function fulfillExtraSession(input: {
  clientId: string;
  amountCents: number;
  reference: string;
  method?: "stripe" | "bizum" | "transfer" | "cash" | "other";
  paymentIntentId?: string | null;
  recordedBy?: string | null;
}) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("stripe_checkout_session_id", input.reference)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: months } = await admin
    .from("settings")
    .select("value")
    .eq("key", "agenda.extra_credit_months")
    .maybeSingle();
  const expires = new Date();
  expires.setMonth(expires.getMonth() + (typeof months?.value === "number" ? months.value : 3));

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      client_id: input.clientId,
      kind: "extra_session",
      method: input.method ?? "stripe",
      status: "paid",
      amount_cents: input.amountCents,
      paid_at: new Date().toISOString(),
      description: "Sesión extra 1 h",
      stripe_checkout_session_id: input.reference,
      stripe_payment_intent_id: input.paymentIntentId ?? null,
      recorded_by: input.recordedBy ?? null,
    })
    .select("id")
    .single();
  if (error || !payment) {
    // Carrera con otra entrega del mismo webhook: ya está registrado
    if (error?.code === "23505") return null;
    throw new Error(`No se pudo registrar el pago de la sesión extra: ${error?.message}`);
  }
  await admin.from("session_credits").insert({
    client_id: input.clientId,
    credit_type: "extra",
    delta: 1,
    reason: "purchase",
    expires_at: expires.toISOString(),
    payment_id: payment.id,
    created_by: input.recordedBy ?? null,
  });

  const { data: c } = await admin
    .from("clients")
    .select("profile_id, profiles(full_name)")
    .eq("id", input.clientId)
    .single();
  if (c?.profile_id) {
    await admin.rpc("notify", {
      p_profile_id: c.profile_id,
      p_type: "extra_session_paid",
      p_title: "Sesión extra lista",
      p_body: "Ya puedes reservarla en la agenda.",
      p_link: "/agenda/reservar?tipo=live_training",
      p_client_id: input.clientId,
    });
  }
  await admin.rpc("notify_staff", {
    p_type: "payment_received",
    p_title: `Sesión extra pagada: ${c?.profiles?.full_name ?? "cliente"}`,
    p_body: formatEuros(input.amountCents),
    p_link: `/panel/clientes/${input.clientId}/agenda`,
    p_client_id: input.clientId,
  });
  return payment.id;
}
