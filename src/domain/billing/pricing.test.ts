import { describe, expect, it } from "vitest";
import { quote } from "./pricing";
import type { AppliedDiscount } from "./types";

const pct = (kind: AppliedDiscount["kind"], percent: number, stackable = true): AppliedDiscount => ({
  discountId: kind,
  kind,
  label: kind,
  duration: "forever",
  durationMonths: null,
  stackable,
  type: "percent",
  percent,
});
const founder: AppliedDiscount = {
  discountId: "founder",
  kind: "founder",
  label: "Precio fundador",
  duration: "forever",
  durationMonths: null,
  stackable: true,
  type: "fixed",
  monthlyCents: 500,
};

describe("quote", () => {
  it("sin descuentos devuelve el precio de lista", () => {
    const q = quote({ monthlyPriceCents: 2490, interval: "month", discounts: [] });
    expect(q).toMatchObject({ listCents: 2490, totalCents: 2490, discountCents: 0, percentTotal: 0, lines: [] });
  });

  it("precio fundador: MVP 64,90 → 59,90", () => {
    const q = quote({ monthlyPriceCents: 6490, interval: "month", discounts: [founder] });
    expect(q.totalCents).toBe(5990);
  });

  it("anual: lista = 12 × mensual y −20 %", () => {
    const q = quote({ monthlyPriceCents: 4490, interval: "year", discounts: [pct("annual", 20)] });
    expect(q.listCents).toBe(53880);
    expect(q.totalCents).toBe(43104);
    expect(q.monthlyEquivalentCents).toBe(3592);
  });

  it("los porcentajes se suman: anual 20 + squad 25 + estudiante 10 = −55 %", () => {
    const q = quote({
      monthlyPriceCents: 2490,
      interval: "year",
      discounts: [pct("annual", 20), pct("squad", 25), pct("student", 10)],
    });
    expect(q.percentTotal).toBe(55);
    expect(q.totalCents).toBe(Math.round(29880 * 0.45));
    // Las líneas cuadran exactamente con el descuento total
    expect(q.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(q.discountCents);
  });

  it("los porcentajes se aplican sobre el precio fundador", () => {
    const q = quote({ monthlyPriceCents: 6490, interval: "month", discounts: [founder, pct("student", 10)] });
    expect(q.totalCents).toBe(Math.round(5990 * 0.9));
    expect(q.lines.find((l) => l.kind === "founder")?.amountCents).toBe(500);
  });

  it("fundador anual: −5 €/mes × 12 y luego −20 %", () => {
    const q = quote({ monthlyPriceCents: 6490, interval: "year", discounts: [founder, pct("annual", 20)] });
    expect(q.totalCents).toBe(Math.round(5990 * 12 * 0.8));
  });

  it("respeta el tope de porcentaje", () => {
    const q = quote({
      monthlyPriceCents: 1000,
      interval: "month",
      discounts: [pct("annual", 50), pct("squad", 40)],
      maxTotalPercent: 60,
    });
    expect(q.percentTotal).toBe(60);
    expect(q.totalCents).toBe(400);
    expect(q.lines.reduce((s, l) => s + l.amountCents, 0)).toBe(600);
  });

  it("nunca baja de 0 aunque la suma pase del 100 %", () => {
    const q = quote({ monthlyPriceCents: 1000, interval: "month", discounts: [pct("custom", 80), pct("squad", 40)] });
    expect(q.totalCents).toBe(0);
  });

  it("un descuento no acumulable no se combina: gana la opción más barata", () => {
    const big = { ...pct("custom", 50, false), discountId: "big" };
    const q = quote({ monthlyPriceCents: 1000, interval: "month", discounts: [pct("student", 10), big] });
    expect(q.totalCents).toBe(500);
    expect(q.lines.map((l) => l.discountId)).toEqual(["big"]);

    const small = { ...pct("custom", 5, false), discountId: "small" };
    const q2 = quote({ monthlyPriceCents: 1000, interval: "month", discounts: [pct("student", 10), small] });
    expect(q2.totalCents).toBe(900);
    expect(q2.lines.map((l) => l.discountId)).toEqual(["student"]);
  });

  it("rechaza precios no enteros", () => {
    expect(() => quote({ monthlyPriceCents: 24.9, interval: "month", discounts: [] })).toThrow();
  });
});
