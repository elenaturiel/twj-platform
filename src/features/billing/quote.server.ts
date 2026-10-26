import "server-only";
import { quote } from "@/domain/billing/pricing";
import type { Quote } from "@/domain/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeSquadFriends, maxTotalPercentSetting, resolveDiscounts } from "./discounts.server";
import type { QuoteInput } from "./schemas";

export type SignupQuote = {
  plan: { id: string; key: string; name: string; monthlyPriceCents: number; stripeProductId: string | null };
  quote: Quote;
  squad: { id: string; friends: number } | null;
  squadCodeStatus: "none" | "ok" | "invalid";
  promoCodeStatus: "none" | "applied" | "invalid";
  founderSlotsLeft: number;
  appliedDiscountIds: string[];
};

/** Presupuesto de un alta. Usa el cliente admin porque lo pide un visitante anónimo. */
export async function buildSignupQuote(
  input: QuoteInput,
  clientId?: string | null,
): Promise<SignupQuote | { error: string }> {
  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans")
    .select("id, key, name, price_cents, is_active, is_public, requires_application, annual_allowed, stripe_product_id")
    .eq("key", input.planKey)
    .maybeSingle();
  if (!plan || !plan.is_active || !plan.is_public || plan.requires_application || plan.price_cents === null) {
    return { error: "Ese plan no se puede contratar online." };
  }
  if (input.interval === "year" && !plan.annual_allowed) return { error: "Ese plan no tiene pago anual." };

  let squad: SignupQuote["squad"] = null;
  let squadCodeStatus: SignupQuote["squadCodeStatus"] = "none";
  if (input.squadCode) {
    const { data } = await admin.from("squads").select("id").ilike("code", input.squadCode).maybeSingle();
    if (data) {
      squad = { id: data.id, friends: await activeSquadFriends(admin, data.id, clientId) };
      squadCodeStatus = "ok";
    } else {
      squadCodeStatus = "invalid";
    }
  }

  const [resolved, maxTotalPercent, slots] = await Promise.all([
    resolveDiscounts(admin, {
      planKey: plan.key,
      interval: input.interval,
      clientId,
      studentClaim: input.studentClaim,
      squadFriends: squad?.friends ?? 0,
      promoCode: input.promoCode || null,
    }),
    maxTotalPercentSetting(admin),
    admin.rpc("founder_slots_left"),
  ]);

  const q = quote({
    monthlyPriceCents: plan.price_cents,
    interval: input.interval,
    discounts: resolved.applied,
    maxTotalPercent,
  });
  return {
    plan: {
      id: plan.id,
      key: plan.key,
      name: plan.name,
      monthlyPriceCents: plan.price_cents,
      stripeProductId: plan.stripe_product_id,
    },
    quote: q,
    squad,
    squadCodeStatus,
    promoCodeStatus: resolved.promoCodeStatus,
    founderSlotsLeft: slots.data ?? 0,
    appliedDiscountIds: q.lines.map((l) => l.discountId),
  };
}
