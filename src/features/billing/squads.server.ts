import "server-only";
import { randomBytes } from "node:crypto";
import { quote } from "@/domain/billing/pricing";
import type { BillingInterval } from "@/domain/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/payments/stripe";
import { activeSquadFriends, maxTotalPercentSetting, resolveDiscounts } from "./discounts.server";
import { attachRecurringDiscounts } from "./stripe-sync";

export function newSquadCode() {
  // Sin caracteres ambiguos (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return `SQUAD-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** Si alguien entra o se da de baja, todos los miembros activos suben o bajan de tramo a la vez. */
export async function recomputeSquad(squadId: string) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("squad_members")
    .select("client_id")
    .eq("squad_id", squadId)
    .is("left_at", null);
  for (const m of members ?? []) await recomputeClientSubscription(m.client_id);
}

/**
 * Recalcula el importe de la suscripción viva de un cliente con sus descuentos
 * vigentes (squad según miembros activos, estudiante si no está rechazado,
 * fundador si ya lo tenía, anual…). Afecta a la PRÓXIMA cuota.
 */
export async function recomputeClientSubscription(clientId: string) {
  const admin = createAdminClient();
  const maxTotalPercent = await maxTotalPercentSetting(admin);
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, billing_mode, billing_interval, list_price_cents, stripe_subscription_id, plans(key, price_cents)")
    .eq("client_id", clientId)
    .in("status", ["active", "past_due"])
    .maybeSingle();
  if (!sub?.plans) return;

  const { data: redemptions } = await admin
    .from("discount_redemptions")
    .select("id, status, discounts!inner(kind)")
    .eq("subscription_id", sub.id)
    .in("status", ["applied", "reserved"]);
  const has = (kind: string) => (redemptions ?? []).some((r) => r.discounts?.kind === kind);

  const { data: membership } = await admin
    .from("squad_members")
    .select("squad_id")
    .eq("client_id", clientId)
    .is("left_at", null)
    .maybeSingle();
  const friends = membership ? await activeSquadFriends(admin, membership.squad_id, clientId) : 0;

  const interval = sub.billing_interval as BillingInterval;
  const resolved = await resolveDiscounts(admin, {
    planKey: sub.plans.key,
    interval,
    clientId: null, // recálculo: no bloquear por "ya usado"
    studentClaim: has("student"),
    squadFriends: friends,
  });
  // El fundador solo se conserva si ya lo tenía en esta suscripción
  const applied = resolved.applied.filter((a) => a.kind !== "founder" || has("founder"));

  // Precio grandfathered: se respeta el precio de lista con el que entró
  const q = quote({
    monthlyPriceCents: Math.round(sub.list_price_cents / (interval === "year" ? 12 : 1)),
    interval,
    discounts: applied,
    maxTotalPercent,
  });
  await admin
    .from("subscriptions")
    .update({
      amount_cents: q.totalCents,
      discount_breakdown: q.lines.map((l) => ({
        kind: l.kind,
        label: l.label,
        amount_cents: l.amountCents,
        percent: l.percent ?? null,
      })),
    })
    .eq("id", sub.id);

  // Squad: deja constancia del canje (para métricas) si ahora aplica
  const squadLine = q.lines.find((l) => l.kind === "squad");
  if (squadLine && !has("squad")) {
    await admin.from("discount_redemptions").insert({
      discount_id: squadLine.discountId,
      client_id: clientId,
      subscription_id: sub.id,
      status: "applied",
      applied_at: new Date().toISOString(),
      snapshot: { percent: squadLine.percent ?? null },
    });
  }

  const stripe = getStripe();
  if (stripe && sub.billing_mode === "stripe" && sub.stripe_subscription_id) {
    await attachRecurringDiscounts(stripe, sub.stripe_subscription_id, sub.id, q.lines);
  }
  return q;
}
