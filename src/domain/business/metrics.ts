/**
 * Métricas de negocio a partir de suscripciones y pagos. Funciones puras.
 * Importes en céntimos e IVA incluido (como se cobran).
 */

export type SubRow = {
  clientId: string;
  planKey: string;
  status: string;
  interval: "month" | "year";
  amountCents: number;
  startedAt: string | null;
  endedAt: string | null;
};
export type PaymentRow = {
  amountCents: number;
  paidAt: string | null;
  status: string;
  kind: string;
  planKey?: string | null;
};

/** Importe mensual equivalente de una suscripción (la anual se reparte entre 12). */
export const monthlyEquivalent = (s: Pick<SubRow, "interval" | "amountCents">) =>
  s.interval === "year" ? Math.round(s.amountCents / 12) : s.amountCents;

const counts = (s: SubRow) => s.status === "active" || s.status === "past_due";

/** MRR: suma mensual de lo que pagan las suscripciones vivas. */
export function mrr(subs: SubRow[]): number {
  return subs.filter(counts).reduce((t, s) => t + monthlyEquivalent(s), 0);
}

export function mrrByPlan(subs: SubRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of subs.filter(counts)) out[s.planKey] = (out[s.planKey] ?? 0) + monthlyEquivalent(s);
  return out;
}

/**
 * Churn de clientes en una ventana: bajas en la ventana / clientes activos al
 * empezar la ventana. null si no había nadie.
 */
export function churnRate(subs: SubRow[], from: string, to: string): number | null {
  const activeAtStart = new Set(
    subs.filter((s) => s.startedAt && s.startedAt < from && (!s.endedAt || s.endedAt >= from)).map((s) => s.clientId),
  );
  if (!activeAtStart.size) return null;
  const stillActive = new Set(subs.filter((s) => !s.endedAt || s.endedAt >= to).map((s) => s.clientId));
  const lost = [...activeAtStart].filter((c) => !stillActive.has(c)).length;
  return lost / activeAtStart.size;
}

/** LTV aproximado = ingreso medio mensual por cliente / churn mensual. */
export function ltv(arpaCents: number, monthlyChurn: number | null): number | null {
  if (!monthlyChurn || monthlyChurn <= 0) return null;
  return Math.round(arpaCents / monthlyChurn);
}

/** Ingresos cobrados por mes (YYYY-MM) en los últimos `months` meses hasta `today`. */
export function revenueByMonth(payments: PaymentRow[], today: string, months = 12): { month: string; cents: number }[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const map = new Map(keys.map((k) => [k, 0]));
  for (const p of payments) {
    if (p.status !== "paid" || !p.paidAt) continue;
    const k = p.paidAt.slice(0, 7);
    if (map.has(k)) map.set(k, map.get(k)! + p.amountCents);
  }
  return keys.map((k) => ({ month: k, cents: map.get(k)! }));
}

export function csv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
