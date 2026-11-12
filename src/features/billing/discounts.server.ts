import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkEligibility, type Ineligible } from "@/domain/billing/eligibility";
import type { AppliedDiscount, BillingInterval, DiscountConfig, SquadTier } from "@/domain/billing/types";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;
type DiscountRow = Database["public"]["Tables"]["discounts"]["Row"];

export function toDiscountConfig(r: DiscountRow): DiscountConfig {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    kind: r.kind as DiscountConfig["kind"],
    type: r.type as DiscountConfig["type"],
    value: r.value === null ? null : Number(r.value),
    tiers: (r.tiers as SquadTier[] | null) ?? null,
    duration: r.duration as DiscountConfig["duration"],
    durationMonths: r.duration_months,
    appliesToPlanKeys: r.applies_to_plan_keys,
    appliesToIntervals: r.applies_to_intervals as BillingInterval[] | null,
    maxRedemptions: r.max_redemptions,
    maxPerClient: r.max_per_client,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    requiresVerification: r.requires_verification,
    autoApply: r.auto_apply,
    stackable: r.stackable,
    isActive: r.is_active,
  };
}

export type DiscountRequest = {
  planKey: string;
  interval: BillingInterval;
  clientId?: string | null;
  /** Declara ser universitario: el carné se verifica después (descuento provisional) */
  studentClaim: boolean;
  /** Amigos activos en su squad (sin contarse a sí mismo) */
  squadFriends: number;
  promoCode?: string | null;
};

export type ResolvedDiscounts = {
  applied: AppliedDiscount[];
  rejected: { discountId: string; kind: string; reason: Ineligible }[];
  promoCodeStatus: "none" | "applied" | "invalid";
};

/** Decide qué descuentos aplican a un alta/renovación concreta. */
export async function resolveDiscounts(admin: Admin, req: DiscountRequest): Promise<ResolvedDiscounts> {
  const { data: rows } = await admin.from("discounts").select("*").eq("is_active", true);
  const configs = (rows ?? []).map(toDiscountConfig);
  const now = new Date();

  const promo = req.promoCode?.trim().toLowerCase() || null;
  const wanted = configs.filter(
    (d) =>
      d.autoApply ||
      (d.kind === "student" && req.studentClaim) ||
      (d.kind === "squad" && req.squadFriends > 0) ||
      (promo !== null && d.code?.toLowerCase() === promo),
  );

  const ids = wanted.map((d) => d.id);
  const [{ data: used }, { data: mine }] = await Promise.all([
    ids.length
      ? admin
          .from("discount_redemptions")
          .select("discount_id, status, reserved_until")
          .in("discount_id", ids)
          .in("status", ["applied", "reserved"])
      : Promise.resolve({ data: [] as { discount_id: string; status: string; reserved_until: string | null }[] }),
    req.clientId && ids.length
      ? admin
          .from("discount_redemptions")
          .select("discount_id, status")
          .eq("client_id", req.clientId)
          .in("discount_id", ids)
      : Promise.resolve({ data: [] as { discount_id: string; status: string }[] }),
  ]);

  const applied: AppliedDiscount[] = [];
  const rejected: ResolvedDiscounts["rejected"] = [];
  for (const d of wanted) {
    const redemptionsUsed = (used ?? []).filter(
      (u) =>
        u.discount_id === d.id &&
        (u.status === "applied" || (u.reserved_until !== null && new Date(u.reserved_until) > now)),
    ).length;
    const clientHistory = (mine ?? []).filter((m) => m.discount_id === d.id);
    const res = checkEligibility(d, {
      planKey: req.planKey,
      interval: req.interval,
      now,
      redemptionsUsed,
      // Las reservas caducadas o expiradas no cuentan como uso
      clientRedemptions: clientHistory.filter((m) => m.status === "applied" || m.status === "revoked").length,
      studentVerified: req.studentClaim,
      squadFriends: req.squadFriends,
      lostFounder: d.kind === "founder" && clientHistory.some((m) => m.status === "revoked"),
    });
    if (res.ok) applied.push(res.applied);
    else rejected.push({ discountId: d.id, kind: d.kind, reason: res.reason });
  }

  const promoMatch = promo ? configs.find((d) => d.code?.toLowerCase() === promo) : undefined;
  const promoCodeStatus = !promo
    ? "none"
    : promoMatch && applied.some((a) => a.discountId === promoMatch.id)
      ? "applied"
      : "invalid";
  return { applied, rejected, promoCodeStatus };
}

/** Miembros activos (pagando) de un squad, excluyendo a un cliente. */
export async function activeSquadFriends(admin: Admin, squadId: string, excludeClientId?: string | null) {
  const { data } = await admin
    .from("squad_members")
    .select("client_id, clients!inner(status)")
    .eq("squad_id", squadId)
    .is("left_at", null)
    .in("clients.status", ["active", "past_due"]);
  return (data ?? []).filter((m) => m.client_id !== excludeClientId).length;
}

export async function maxTotalPercentSetting(admin: Admin): Promise<number | null> {
  const { data } = await admin
    .from("settings")
    .select("value")
    .eq("key", "billing.max_total_discount_percent")
    .maybeSingle();
  return typeof data?.value === "number" ? data.value : null;
}
