import { addDays, diffDays } from "@/domain/billing/renewal";
import { weekdayMondayFirst } from "@/domain/training/week";

/**
 * ¿Toca crear un check-in hoy? Devuelve la fecha del check-in (due_on) o null.
 * - Primer check-in: el primer `weekday` (lunes = 0) a partir de 3 días después
 *   del alta, para no pedir datos el mismo día que empieza.
 * - Siguientes: cada `frequencyDays` desde el último. Si se saltó varios, solo se
 *   crea uno (el más reciente), no una pila de pendientes.
 */
export function checkinDueOn(params: {
  lastDueOn: string | null;
  startedOn: string;
  frequencyDays: number;
  weekday: number;
  today: string;
}): string | null {
  const { lastDueOn, startedOn, frequencyDays, weekday, today } = params;
  const freq = Math.max(1, Math.round(frequencyDays));
  if (!lastDueOn) {
    const from = addDays(startedOn, 3);
    const first = addDays(from, (weekday - weekdayMondayFirst(from) + 7) % 7);
    return today >= first ? first : null;
  }
  const elapsed = diffDays(lastDueOn, today);
  if (elapsed < freq) return null;
  return addDays(lastDueOn, Math.floor(elapsed / freq) * freq);
}

/** Un check-in pendiente se da por perdido pasados `graceDays` días. */
export function isCheckinMissed(dueOn: string, today: string, graceDays = 7) {
  return diffDays(dueOn, today) > graceDays;
}

/** Recordatorio el día siguiente al que tocaba si sigue pendiente. */
export function checkinReminderDue(dueOn: string, today: string) {
  return diffDays(dueOn, today) === 1;
}
