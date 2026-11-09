/**
 * Rachas, medallas y progreso de retos. Funciones puras: el servidor les pasa
 * los datos ya cargados y guarda el resultado.
 */

export type WeekStat = { weekStart: string; planned: number; done: number };

/** Semana "cumplida": al menos el 80 % de lo planificado. */
export const WEEK_THRESHOLD = 0.8;
export const weekMet = (w: WeekStat) => w.planned > 0 && w.done / w.planned >= WEEK_THRESHOLD;

/**
 * Racha de entreno en semanas. Cuenta hacia atrás desde la semana pasada
 * (la actual suma si ya está cumplida, pero si va a medias no rompe nada).
 * Las semanas sin nada planificado (vacaciones, descarga sin sesiones) se saltan.
 */
export function trainingStreak(weeks: WeekStat[], currentWeekStart: string): number {
  const sorted = [...weeks].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
  let streak = 0;
  for (const w of sorted) {
    if (w.weekStart > currentWeekStart) continue;
    if (w.weekStart === currentWeekStart) {
      if (weekMet(w)) streak++;
      continue;
    }
    if (w.planned === 0) continue;
    if (!weekMet(w)) break;
    streak++;
  }
  return streak;
}

/** La mejor racha de la historia (para "tu récord de racha"). */
export function bestTrainingStreak(weeks: WeekStat[]): number {
  const sorted = [...weeks].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  let best = 0;
  let run = 0;
  for (const w of sorted) {
    if (w.planned === 0) continue;
    run = weekMet(w) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export type CheckinStat = { dueOn: string; status: string; submittedAt: string | null };

/**
 * Check-ins seguidos entregados a tiempo (hasta el día siguiente al previsto).
 * Uno pendiente que aún no ha vencido no rompe la racha.
 */
export function checkinStreak(checkins: CheckinStat[], today: string): number {
  const sorted = [...checkins].sort((a, b) => (a.dueOn < b.dueOn ? 1 : -1));
  let streak = 0;
  for (const c of sorted) {
    if (c.status === "pending" && c.dueOn >= addDaysIso(today, -1)) continue;
    const done = (c.status === "submitted" || c.status === "reviewed") && c.submittedAt;
    if (!done) break;
    const submittedDay = c.submittedAt!.slice(0, 10);
    if (submittedDay > addDaysIso(c.dueOn, 1)) break;
    streak++;
  }
  return streak;
}

function addDaysIso(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Totals = {
  workouts: number;
  prs: number;
  trainingWeeks: number;
  checkinStreak: number;
  liveSessions: number;
};

/** Medallas de hitos que corresponden a unos totales. */
export function milestoneBadges(t: Totals): string[] {
  const out: string[] = [];
  if (t.workouts >= 1) out.push("first_workout");
  if (t.workouts >= 10) out.push("workouts_10");
  if (t.workouts >= 50) out.push("workouts_50");
  if (t.workouts >= 100) out.push("workouts_100");
  if (t.prs >= 1) out.push("first_pr");
  if (t.prs >= 10) out.push("prs_10");
  if (t.trainingWeeks >= 4) out.push("streak_4");
  if (t.trainingWeeks >= 8) out.push("streak_8");
  if (t.trainingWeeks >= 12) out.push("streak_12");
  if (t.checkinStreak >= 4) out.push("checkins_4");
  if (t.liveSessions >= 1) out.push("live_session");
  return out;
}

export type ChallengeRule =
  | { type: "workouts_count"; target: number }
  | { type: "checkins_count"; target: number }
  | { type: "prs_count"; target: number }
  | { type: "live_sessions"; target: number }
  | { type: "metric_total"; target: number; metric: string };

export const RULE_LABELS: Record<ChallengeRule["type"], string> = {
  workouts_count: "Entrenos registrados",
  checkins_count: "Check-ins entregados",
  prs_count: "Récords batidos",
  live_sessions: "Entrenos en directo",
  metric_total: "Total de una métrica",
};

/** Datos del cliente DENTRO de la ventana del reto. */
export type ChallengeWindowData = {
  workouts: number;
  checkins: number;
  prs: number;
  liveSessions: number;
  metricTotals: Record<string, number>;
};

export function challengeProgress(rule: ChallengeRule, d: ChallengeWindowData): number {
  switch (rule.type) {
    case "workouts_count":
      return d.workouts;
    case "checkins_count":
      return d.checkins;
    case "prs_count":
      return d.prs;
    case "live_sessions":
      return d.liveSessions;
    case "metric_total":
      return Math.round((d.metricTotals[rule.metric] ?? 0) * 100) / 100;
  }
}

export function parseRule(raw: unknown): ChallengeRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const target = Number(r.target);
  if (!Number.isFinite(target) || target <= 0) return null;
  if (r.type === "metric_total")
    return typeof r.metric === "string" && r.metric ? { type: "metric_total", target, metric: r.metric } : null;
  if (
    r.type === "workouts_count" ||
    r.type === "checkins_count" ||
    r.type === "prs_count" ||
    r.type === "live_sessions"
  )
    return { type: r.type, target };
  return null;
}

export const progressPct = (progress: number, target: number) =>
  Math.max(0, Math.min(100, Math.round((progress / target) * 100)));
