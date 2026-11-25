import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export const APP_TIME_ZONE = "Europe/Madrid";

/** Hoy en Madrid como YYYY-MM-DD */
export function todayInMadrid(now: Date = new Date()): string {
  return format(new TZDate(now, APP_TIME_ZONE), "yyyy-MM-dd");
}
