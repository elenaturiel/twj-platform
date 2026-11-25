import { describe, expect, it } from "vitest";
import { churnRate, csv, ltv, monthlyEquivalent, mrr, mrrByPlan, revenueByMonth, type SubRow } from "./metrics";

const S = (clientId: string, planKey: string, amountCents: number, o: Partial<SubRow> = {}): SubRow => ({
  clientId,
  planKey,
  amountCents,
  status: "active",
  interval: "month",
  startedAt: "2026-01-01",
  endedAt: null,
  ...o,
});

describe("métricas de negocio", () => {
  it("MRR reparte las anuales entre 12 e ignora las canceladas", () => {
    const subs = [
      S("a", "mvp", 8900),
      S("b", "all_in", 59880, { interval: "year" }),
      S("c", "rookie", 3900, { status: "cancelled" }),
      S("d", "mvp", 8900, { status: "past_due" }),
    ];
    expect(monthlyEquivalent(subs[1]!)).toBe(4990);
    expect(mrr(subs)).toBe(8900 + 4990 + 8900);
    expect(mrrByPlan(subs)).toEqual({ mvp: 17800, all_in: 4990 });
  });
  it("churn = bajas en la ventana / activos al empezar", () => {
    const subs = [
      S("a", "mvp", 1),
      S("b", "mvp", 1, { endedAt: "2026-10-15", status: "cancelled" }),
      S("c", "mvp", 1, { startedAt: "2026-10-20" }),
      S("d", "mvp", 1),
    ];
    expect(churnRate(subs, "2026-10-01", "2026-11-01")).toBeCloseTo(1 / 3);
    expect(churnRate([], "2026-10-01", "2026-11-01")).toBeNull();
  });
  it("LTV = ARPA / churn mensual", () => {
    expect(ltv(6000, 0.05)).toBe(120000);
    expect(ltv(6000, 0)).toBeNull();
  });
  it("ingresos por mes con meses vacíos a cero", () => {
    const r = revenueByMonth(
      [
        { amountCents: 100, paidAt: "2026-11-02T10:00:00Z", status: "paid", kind: "subscription" },
        { amountCents: 50, paidAt: "2026-09-30T10:00:00Z", status: "paid", kind: "extra_session" },
        { amountCents: 999, paidAt: "2026-11-03T10:00:00Z", status: "refunded", kind: "subscription" },
      ],
      "2026-11-09",
      3,
    );
    expect(r).toEqual([
      { month: "2026-09", cents: 50 },
      { month: "2026-10", cents: 0 },
      { month: "2026-11", cents: 100 },
    ]);
  });
  it("CSV con BOM y comillas", () => {
    expect(
      csv([
        ["a", 'di "hola"'],
        [1, null],
      ]),
    ).toBe('﻿a,"di ""hola"""\r\n1,');
  });
});
