import type { AppliedDiscount, BillingInterval, DiscountConfig, SquadTier } from "./types";

export type EligibilityContext = {
  planKey: string;
  interval: BillingInterval;
  now: Date;
  /** Canjes que ya ocupan plaza (aplicados + reservas vigentes) */
  redemptionsUsed: number;
  /** Canjes previos de este cliente */
  clientRedemptions: number;
  /** Tiene el carné verificado (o pendiente de verificar en el alta) */
  studentVerified: boolean;
  /** Amigos en el squad SIN contarse a uno mismo */
  squadFriends: number;
  /** Ya disfrutó del fundador y se dio de baja: lo pierde para siempre */
  lostFounder?: boolean;
};

export type Ineligible =
  | "inactive"
  | "not_started"
  | "expired"
  | "plan"
  | "interval"
  | "sold_out"
  | "already_used"
  | "needs_verification"
  | "squad_too_small"
  | "founder_lost";

export function checkEligibility(
  d: DiscountConfig,
  ctx: EligibilityContext,
): { ok: true; applied: AppliedDiscount } | { ok: false; reason: Ineligible } {
  if (!d.isActive) return { ok: false, reason: "inactive" };
  if (d.startsAt && new Date(d.startsAt) > ctx.now) return { ok: false, reason: "not_started" };
  if (d.expiresAt && new Date(d.expiresAt) <= ctx.now) return { ok: false, reason: "expired" };
  if (d.appliesToPlanKeys && !d.appliesToPlanKeys.includes(ctx.planKey)) return { ok: false, reason: "plan" };
  if (d.appliesToIntervals && !d.appliesToIntervals.includes(ctx.interval)) return { ok: false, reason: "interval" };
  if (d.maxRedemptions !== null && ctx.redemptionsUsed >= d.maxRedemptions) return { ok: false, reason: "sold_out" };
  if (ctx.clientRedemptions >= d.maxPerClient) return { ok: false, reason: "already_used" };
  if (d.kind === "founder" && ctx.lostFounder) return { ok: false, reason: "founder_lost" };
  if (d.requiresVerification && !ctx.studentVerified) return { ok: false, reason: "needs_verification" };

  const common = {
    discountId: d.id,
    kind: d.kind,
    label: d.name,
    duration: d.duration,
    durationMonths: d.durationMonths,
    stackable: d.stackable,
  } as const;

  if (d.type === "tiered_percent") {
    const percent = squadPercent(d.tiers ?? [], ctx.squadFriends);
    if (percent === 0) return { ok: false, reason: "squad_too_small" };
    return { ok: true, applied: { ...common, type: "percent", percent, label: `${d.name} (−${percent} %)` } };
  }
  if (d.type === "percent") return { ok: true, applied: { ...common, type: "percent", percent: d.value ?? 0 } };
  return { ok: true, applied: { ...common, type: "fixed", monthlyCents: Math.round(d.value ?? 0) } };
}

/** Tramo del squad: el mayor min_friends que se cumple (tope = último tramo). */
export function squadPercent(tiers: SquadTier[], friends: number): number {
  return [...tiers]
    .sort((a, b) => a.min_friends - b.min_friends)
    .reduce((pct, t) => (friends >= t.min_friends ? t.percent : pct), 0);
}
