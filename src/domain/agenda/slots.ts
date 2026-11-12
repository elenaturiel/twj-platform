import { TZDate } from "@date-fns/tz";
import { addDays } from "@/domain/billing/renewal";
import { weekdayMondayFirst } from "@/domain/training/week";

export const TZ = "Europe/Madrid";

export type AvailabilityRule = {
  weekday: number;
  start_time: string;
  end_time: string;
  type_keys: string[];
  is_active: boolean;
};
export type ExceptionRange = { starts_at: string; ends_at: string; kind: "blocked" | "extra" };
export type BusyRange = { starts_at: string; ends_at: string };
export type SlotType = {
  key: string;
  duration_min: number;
  buffer_min: number;
  min_notice_h: number;
  available_from: string | null;
};

/** Instante UTC de una fecha y hora locales de Madrid ("2026-11-09", "18:30"). DST incluido. */
export function madridInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, TZ).getTime());
}

/** Fecha (YYYY-MM-DD) y hora (HH:mm) en Madrid de un instante. */
export function madridParts(at: Date | string): { date: string; time: string } {
  const z = new TZDate(new Date(at).getTime(), TZ);
  const p = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${z.getFullYear()}-${p(z.getMonth() + 1)}-${p(z.getDate())}`,
    time: `${p(z.getHours())}:${p(z.getMinutes())}`,
  };
}

const MIN = 60_000;
const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/**
 * Huecos reservables de un tipo de cita en un día (hora de Madrid).
 * Reglas (las mismas que `slot_is_open` + `book_appointment` en la BD):
 * dentro de una franja de disponibilidad (o de una excepción "extra"), sin solapar
 * bloqueos ni citas (con margen), con la antelación mínima y desde `available_from`.
 */
export function slotsForDay(input: {
  date: string;
  type: SlotType;
  rules: AvailabilityRule[];
  exceptions: ExceptionRange[];
  busy: BusyRange[];
  now: Date;
  stepMin?: number;
}): Date[] {
  const { date, type, rules, exceptions, busy, now } = input;
  const step = input.stepMin ?? 30;
  if (type.available_from && date < type.available_from) return [];
  const wd = weekdayMondayFirst(date);
  const dur = type.duration_min * MIN;
  const buf = type.buffer_min * MIN;
  const earliest = now.getTime() + type.min_notice_h * 60 * MIN;

  // Ventanas candidatas: franjas del día + excepciones "extra" que caen ese día
  const windows: [number, number][] = rules
    .filter((r) => r.is_active && r.weekday === wd && (r.type_keys.length === 0 || r.type_keys.includes(type.key)))
    .map((r) => [madridInstant(date, r.start_time).getTime(), madridInstant(date, r.end_time.slice(0, 5)).getTime()]);
  const dayStart = madridInstant(date, "00:00").getTime();
  const dayEnd = madridInstant(addDays(date, 1), "00:00").getTime();
  for (const x of exceptions) {
    if (x.kind !== "extra") continue;
    const s = Math.max(new Date(x.starts_at).getTime(), dayStart);
    const e = Math.min(new Date(x.ends_at).getTime(), dayEnd);
    if (e > s) windows.push([s, e]);
  }
  const blocked = exceptions
    .filter((x) => x.kind === "blocked")
    .map((x) => [new Date(x.starts_at).getTime(), new Date(x.ends_at).getTime()] as const);
  const taken = busy.map((b) => [new Date(b.starts_at).getTime() - buf, new Date(b.ends_at).getTime() + buf] as const);

  const out = new Set<number>();
  for (const [w0, w1] of windows) {
    for (let s = w0; s + dur <= w1; s += step * MIN) {
      const e = s + dur;
      if (s < earliest) continue;
      if (blocked.some(([b0, b1]) => overlaps(s, e, b0, b1))) continue;
      if (taken.some(([b0, b1]) => overlaps(s, e, b0, b1))) continue;
      out.add(s);
    }
  }
  return [...out].sort((a, b) => a - b).map((t) => new Date(t));
}

/** Días (YYYY-MM-DD) desde hoy hasta el horizonte de reserva. */
export function bookingDays(today: string, horizonDays: number): string[] {
  return Array.from({ length: horizonDays }, (_, i) => addDays(today, i));
}

/** ¿Se puede cancelar/mover sin perder el crédito? */
export function canCancelFree(startsAt: string | Date, cancelNoticeH: number, now: Date): boolean {
  return new Date(startsAt).getTime() - now.getTime() >= cancelNoticeH * 60 * MIN;
}

/**
 * Ventana mensual de créditos que contiene `today`, anclada al inicio del periodo
 * de pago (sirve igual para cuotas mensuales y anuales: en la anual se conceden cada mes).
 */
export function creditWindow(periodStart: string, today: string): { start: string; end: string } {
  const [y, m, d] = periodStart.split("-").map(Number) as [number, number, number];
  const at = (k: number) => {
    const first = new Date(Date.UTC(y, m - 1 + k, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, last)))
      .toISOString()
      .slice(0, 10);
  };
  let k = 0;
  while (at(k + 1) <= today) k++;
  return { start: at(k), end: at(k + 1) };
}

export function formatSlot(at: Date | string): string {
  return new Date(at).toLocaleString("es-ES", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(at: Date | string): string {
  return new Date(at).toLocaleTimeString("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
