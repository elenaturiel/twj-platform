import { addDays, diffDays } from "@/domain/billing/renewal";

/** Día de la semana con lunes = 0 … domingo = 6 (YYYY-MM-DD). */
export function weekdayMondayFirst(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return (js + 6) % 7;
}

/** Índice de semana del bloque que corresponde a `today` (null si aún no empieza). */
export function currentWeekIndex(startsOn: string | null, today: string): number | null {
  if (!startsOn) return null;
  const days = diffDays(startsOn, today);
  if (days < 0) return null;
  return Math.floor(days / 7);
}

/** Fecha concreta de una sesión: inicio del bloque + semana + día. */
export function sessionDate(startsOn: string | null, weekIndex: number, dayIndex: number | null): string | null {
  if (!startsOn || dayIndex == null) return null;
  return addDays(startsOn, weekIndex * 7 + dayIndex);
}

export const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

/** Lunes de la semana de una fecha (YYYY-MM-DD). */
export function mondayOf(date: string): string {
  return addDays(date, -weekdayMondayFirst(date));
}
