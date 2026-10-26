import type { AppliedDiscount, BillingInterval, Quote, QuoteLine } from "./types";

export function monthsIn(interval: BillingInterval) {
  return interval === "year" ? 12 : 1;
}

type QuoteInput = {
  monthlyPriceCents: number;
  interval: BillingInterval;
  discounts: AppliedDiscount[];
  /** Tope de la suma de porcentajes (null = sin tope; nunca más de 100) */
  maxTotalPercent?: number | null;
};

/**
 * Calcula el precio final de un periodo.
 *
 * Reglas (docs/PLAN.md §0):
 * - Lista = mensual × meses del periodo.
 * - Los descuentos fijos (p. ej. fundador, −5 €/mes) se restan primero: el fundador
 *   es "un precio", y los porcentajes se aplican sobre él.
 * - Los porcentajes se SUMAN (anual 20 + squad 25 + estudiante 10 = 55 %), con tope opcional.
 * - Los descuentos no acumulables no se combinan: se elige la opción más barata para el cliente.
 * - Todo en céntimos enteros; el redondeo nunca deja el total por debajo de 0.
 */
export function quote(input: QuoteInput): Quote {
  const nonStackable = input.discounts.filter((d) => !d.stackable);
  const stackable = input.discounts.filter((d) => d.stackable);

  const candidates: AppliedDiscount[][] =
    nonStackable.length === 0 ? [stackable] : [stackable, ...nonStackable.map((d) => [d])];

  return candidates
    .map((set) => quoteSet({ ...input, discounts: set }))
    .reduce((best, q) => (q.totalCents < best.totalCents ? q : best));
}

function quoteSet({ monthlyPriceCents, interval, discounts, maxTotalPercent }: QuoteInput): Quote {
  if (!Number.isInteger(monthlyPriceCents) || monthlyPriceCents < 0) {
    throw new Error("monthlyPriceCents debe ser un entero ≥ 0");
  }
  const months = monthsIn(interval);
  const listCents = monthlyPriceCents * months;
  const lines: QuoteLine[] = [];

  // 1) Fijos (por mes)
  let base = listCents;
  for (const d of discounts) {
    if (d.type !== "fixed") continue;
    const amount = Math.min(d.monthlyCents * months, base);
    base -= amount;
    lines.push(line(d, amount));
  }

  // 2) Porcentajes sumados sobre la base
  const percents = discounts.filter((d): d is Extract<AppliedDiscount, { type: "percent" }> => d.type === "percent");
  const rawPercent = percents.reduce((sum, d) => sum + d.percent, 0);
  const cap = Math.min(maxTotalPercent ?? 100, 100);
  const percentTotal = Math.min(rawPercent, cap);
  const percentDiscount = Math.round((base * percentTotal) / 100);

  // Reparte el descuento porcentual entre líneas (proporcional, el resto de redondeo a la última)
  let assigned = 0;
  percents.forEach((d, i) => {
    const share =
      i === percents.length - 1
        ? percentDiscount - assigned
        : Math.round((percentDiscount * d.percent) / (rawPercent || 1));
    assigned += share;
    lines.push({ ...line(d, share), percent: d.percent });
  });

  const totalCents = Math.max(base - percentDiscount, 0);
  return {
    interval,
    months,
    listCents,
    totalCents,
    discountCents: listCents - totalCents,
    percentTotal,
    lines,
    monthlyEquivalentCents: Math.round(totalCents / months),
  };
}

function line(d: AppliedDiscount, amountCents: number): QuoteLine {
  return {
    discountId: d.discountId,
    kind: d.kind,
    label: d.label,
    amountCents,
    duration: d.duration,
    durationMonths: d.durationMonths,
  };
}
