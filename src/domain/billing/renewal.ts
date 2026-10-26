import type { BillingInterval } from "./types";
import { monthsIn } from "./pricing";

/** Fechas como YYYY-MM-DD (zona Madrid). Se opera en UTC para no depender del huso del servidor. */
function parse(date: string) {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return { y, m, d };
}
function fmt(y: number, m: number, d: number) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Suma meses respetando el día de anclaje: 31-ene → 28/29-feb → 31-mar.
 * `anchorDay` es el día del alta; si el mes no lo tiene, se usa el último día.
 */
export function addMonthsAnchored(date: string, months: number, anchorDay?: number): string {
  const { y, m, d } = parse(date);
  const anchor = anchorDay ?? d;
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmt(ny, nm, Math.min(anchor, daysInMonth(ny, nm)));
}

export function addDays(date: string, days: number): string {
  const { y, m, d } = parse(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return fmt(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function diffDays(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** Periodo que cubre un pago que empieza en `start`. `end` es el primer día NO cubierto (= renovación). */
export function billingPeriod(start: string, interval: BillingInterval, anchorDay?: number) {
  return { start, end: addMonthsAnchored(start, monthsIn(interval), anchorDay ?? parse(start).d) };
}

/**
 * Siguiente periodo al registrar un pago manual:
 * - Si estaba al día o en gracia, el nuevo periodo empieza donde acabó el anterior
 *   (no se "regalan" días por pagar tarde ni se pierden por pagar antes).
 * - Si es el primer pago, o el anterior acabó hace más de `restartAfterDays`,
 *   empieza el día del pago (reenganche).
 */
export function nextManualPeriod(params: {
  previousEnd: string | null;
  paidOn: string;
  interval: BillingInterval;
  anchorDay?: number;
  restartAfterDays?: number;
}) {
  const { previousEnd, paidOn, interval, anchorDay, restartAfterDays = 30 } = params;
  const continues = previousEnd !== null && diffDays(previousEnd, paidOn) <= restartAfterDays;
  const start = continues ? previousEnd! : paidOn;
  return billingPeriod(start, interval, continues ? anchorDay : parse(paidOn).d);
}

export type ManualStatus = "active" | "past_due";

/** Estado de una suscripción manual según la fecha de renovación. */
export function manualStatusOn(params: { periodEnd: string; today: string; graceDays: number }) {
  const { periodEnd, today, graceDays } = params;
  if (today < periodEnd) return { status: "active" as const, graceUntil: null };
  const graceUntil = addDays(periodEnd, graceDays);
  return { status: "past_due" as const, graceUntil, accessBlocked: today > graceUntil };
}

/** Días (respecto al vencimiento) en los que toca recordatorio, p. ej. [-3, 0, 3]. */
export function reminderDue(params: { periodEnd: string; today: string; offsets: number[] }) {
  const delta = diffDays(params.periodEnd, params.today);
  return params.offsets.includes(delta) ? delta : null;
}
