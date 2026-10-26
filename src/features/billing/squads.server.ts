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

/**
 * Recalcula el descuento de todos los miembros activos de un squad (cuando
 * alguien entra o se da de baja: todos suben o bajan de tramo a la vez).
 * Afecta a la PRÓXIMA cuota: no se rehacen cobros ya hechos.
 */
export async function recomputeSquad(squadId: string) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("squad_members")
    .select("client_id")
    .eq("squad_id", squadId)
    .is("left_at", null);
  const maxTotalPercent = await maxTotalPercentSetting(admin);

  for (const m of members ?? []) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, billing_mode, billing_interval, list_price_cents, stripe_subscription_id, plans(key, price_cents)")
      .eq("client_id", m.client_id)
      .in("status", ["active", "past_due"])
      .maybeSingle();
    if (!sub?.plans || sub.plans.price_cents === null) continue;

    const { count: student } = await admin
      .from("discount_redemptions")
      .select("id, discounts!inner(kind)", { count: "exact", head: true })
      .eq("client_id", m.client_id)
      .eq("subscription_id", sub.id)
      .eq("status", "applied")
      .eq("discounts.kind", "student");

    const friends = await activeSquadFriends(admin, squadId, m.client_id);
    const interval = sub.billing_interval as BillingInterval;
    const resolved = await resolveDiscounts(admin, {
      planKey: sub.plans.key,
      interval,
      clientId: null, // recalcular: no bloquear por "ya usado"
      studentClaim: (student ?? 0) > 0,
      squadFriends: friends,
    });
    // El fundador solo se conserva si ya lo tenía aplicado en esta suscripción
    const { data: founderApplied } = await admin
      .from("discount_redemptions")
      .select("id, discounts!inner(kind)")
      .eq("subscription_id", sub.id)
      .eq("status", "applied")
      .eq("discounts.kind", "founder")
      .maybeSingle();
    const applied = resolved.applied.filter((a) => a.kind !== "founder" || founderApplied);

    // Precio grandfathered: se respeta el list_price de la suscripción
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

    const stripe = getStripe();
    if (stripe && sub.billing_mode === "stripe" && sub.stripe_subscription_id) {
      await attachRecurringDiscounts(stripe, sub.stripe_subscription_id, sub.id, q.lines);
    }
  }
}
