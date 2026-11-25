import { describe, expect, it } from "vitest";
import { checkEligibility, squadPercent, type EligibilityContext } from "./eligibility";
import type { DiscountConfig } from "./types";

const base: DiscountConfig = {
  id: "d",
  code: null,
  name: "Desc",
  kind: "custom",
  type: "percent",
  value: 10,
  tiers: null,
  duration: "forever",
  durationMonths: null,
  appliesToPlanKeys: null,
  appliesToIntervals: null,
  maxRedemptions: null,
  maxPerClient: 1,
  startsAt: null,
  expiresAt: null,
  requiresVerification: false,
  autoApply: false,
  stackable: true,
  isActive: true,
};
const ctx: EligibilityContext = {
  planKey: "all_in",
  interval: "month",
  now: new Date("2026-10-26T12:00:00Z"),
  redemptionsUsed: 0,
  clientRedemptions: 0,
  studentVerified: false,
  squadFriends: 0,
};

const squad: DiscountConfig = {
  ...base,
  kind: "squad",
  type: "tiered_percent",
  value: null,
  tiers: [
    { min_friends: 2, percent: 15 },
    { min_friends: 3, percent: 25 },
  ],
  appliesToPlanKeys: ["rookie", "all_in"],
};

describe("squadPercent (2 amigos = 3 personas −15 %; 3 amigos −25 %; tope en 3)", () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 15],
    [3, 25],
    [7, 25],
  ])("%i amigos → %i %%", (friends, expected) => {
    expect(squadPercent(squad.tiers!, friends)).toBe(expected);
  });
});

describe("checkEligibility", () => {
  it("descuento básico aplica", () => {
    expect(checkEligibility(base, ctx)).toMatchObject({ ok: true, applied: { type: "percent", percent: 10 } });
  });

  it("fundador: solo MVP y hasta agotar las 6 plazas", () => {
    const founder: DiscountConfig = {
      ...base,
      kind: "founder",
      type: "fixed",
      value: 500,
      maxRedemptions: 6,
      appliesToPlanKeys: ["mvp"],
    };
    expect(checkEligibility(founder, { ...ctx, planKey: "all_in" })).toEqual({ ok: false, reason: "plan" });
    expect(checkEligibility(founder, { ...ctx, planKey: "mvp", redemptionsUsed: 5 })).toMatchObject({ ok: true });
    expect(checkEligibility(founder, { ...ctx, planKey: "mvp", redemptionsUsed: 6 })).toEqual({
      ok: false,
      reason: "sold_out",
    });
  });

  it("fundador: si se dio de baja, lo pierde", () => {
    const founder: DiscountConfig = { ...base, kind: "founder", type: "fixed", value: 500, appliesToPlanKeys: ["mvp"] };
    expect(checkEligibility(founder, { ...ctx, planKey: "mvp", lostFounder: true })).toEqual({
      ok: false,
      reason: "founder_lost",
    });
  });

  it("estudiante requiere carné", () => {
    const student: DiscountConfig = { ...base, kind: "student", requiresVerification: true };
    expect(checkEligibility(student, ctx)).toEqual({ ok: false, reason: "needs_verification" });
    expect(checkEligibility(student, { ...ctx, studentVerified: true })).toMatchObject({ ok: true });
  });

  it("anual solo con intervalo anual", () => {
    const annual: DiscountConfig = { ...base, kind: "annual", value: 20, appliesToIntervals: ["year"] };
    expect(checkEligibility(annual, ctx)).toEqual({ ok: false, reason: "interval" });
    expect(checkEligibility(annual, { ...ctx, interval: "year" })).toMatchObject({ ok: true });
  });

  it("squad: necesita al menos 2 amigos y solo Rookie/All In", () => {
    expect(checkEligibility(squad, { ...ctx, squadFriends: 1 })).toEqual({ ok: false, reason: "squad_too_small" });
    expect(checkEligibility(squad, { ...ctx, squadFriends: 3 })).toMatchObject({
      ok: true,
      applied: { percent: 25 },
    });
    expect(checkEligibility(squad, { ...ctx, planKey: "mvp", squadFriends: 3 })).toEqual({ ok: false, reason: "plan" });
  });

  it("fechas de inicio y caducidad", () => {
    expect(checkEligibility({ ...base, startsAt: "2026-11-01T00:00:00Z" }, ctx)).toEqual({
      ok: false,
      reason: "not_started",
    });
    expect(checkEligibility({ ...base, expiresAt: "2026-10-26T12:00:00Z" }, ctx)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("límite por cliente y descuentos inactivos", () => {
    expect(checkEligibility(base, { ...ctx, clientRedemptions: 1 })).toEqual({ ok: false, reason: "already_used" });
    expect(checkEligibility({ ...base, isActive: false }, ctx)).toEqual({ ok: false, reason: "inactive" });
  });
});
