/** 1RM estimado (Epley). Solo es fiable hasta ~10 repeticiones. */
export function estimatedOneRepMax(loadKg: number, reps: number): number | null {
  if (!loadKg || loadKg <= 0 || !reps || reps <= 0 || reps > 12) return null;
  if (reps === 1) return round1(loadKg);
  return round1(loadKg * (1 + reps / 30));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export type SetForRecords = {
  id: string;
  exerciseId: string | null;
  reps?: number | null;
  loadKg?: number | null;
  durationS?: number | null;
  distanceM?: number | null;
  stationKey?: string | null;
};

export type RecordCandidate = {
  exerciseId: string | null;
  recordType: "max_load" | "e1rm" | "best_time" | "longest_distance" | "hyrox_station";
  recordKey: string;
  value: number;
  unit: string;
  setLogId: string;
};

export type BestMap = Map<string, number>; // clave = tipo|ejercicio|key

export const bestKey = (c: Pick<RecordCandidate, "recordType" | "exerciseId" | "recordKey">) =>
  `${c.recordType}|${c.exerciseId ?? ""}|${c.recordKey}`;

/** Distancias "redondas" de carrera en las que guardamos mejor tiempo. */
const RACE_DISTANCES = [1000, 3000, 5000, 10000, 21097, 42195];

/** Candidatos a récord de un conjunto de series. */
export function recordCandidates(sets: SetForRecords[]): RecordCandidate[] {
  const out: RecordCandidate[] = [];
  for (const s of sets) {
    if (s.stationKey && s.durationS) {
      out.push({
        exerciseId: s.exerciseId,
        recordType: "hyrox_station",
        recordKey: s.stationKey,
        value: s.durationS,
        unit: "s",
        setLogId: s.id,
      });
      continue;
    }
    if (s.loadKg && s.loadKg > 0 && s.reps && s.reps > 0 && s.exerciseId) {
      out.push({
        exerciseId: s.exerciseId,
        recordType: "max_load",
        recordKey: "",
        value: s.loadKg,
        unit: "kg",
        setLogId: s.id,
      });
      const e1rm = estimatedOneRepMax(s.loadKg, s.reps);
      if (e1rm)
        out.push({
          exerciseId: s.exerciseId,
          recordType: "e1rm",
          recordKey: "",
          value: e1rm,
          unit: "kg",
          setLogId: s.id,
        });
    }
    if (s.distanceM && s.durationS && RACE_DISTANCES.includes(s.distanceM)) {
      out.push({
        exerciseId: null,
        recordType: "best_time",
        recordKey: String(s.distanceM),
        value: s.durationS,
        unit: "s",
        setLogId: s.id,
      });
    }
    if (s.distanceM && s.distanceM > 0 && !s.stationKey) {
      out.push({
        exerciseId: null,
        recordType: "longest_distance",
        recordKey: "",
        value: s.distanceM,
        unit: "m",
        setLogId: s.id,
      });
    }
  }
  return out;
}

const LOWER_IS_BETTER = new Set(["best_time", "hyrox_station"]);

/**
 * Récords nuevos respecto a los mejores anteriores. Solo el mejor de cada clave
 * dentro de la sesión. Si no había marca previa, también cuenta (primera marca),
 * salvo longest_distance, que solo es récord si supera una anterior.
 */
export function newRecords(candidates: RecordCandidate[], previousBest: BestMap): RecordCandidate[] {
  const bestInSession = new Map<string, RecordCandidate>();
  for (const c of candidates) {
    const k = bestKey(c);
    const cur = bestInSession.get(k);
    const better = !cur || (LOWER_IS_BETTER.has(c.recordType) ? c.value < cur.value : c.value > cur.value);
    if (better) bestInSession.set(k, c);
  }
  return [...bestInSession.values()].filter((c) => {
    const prev = previousBest.get(bestKey(c));
    if (prev === undefined) return c.recordType !== "longest_distance";
    return LOWER_IS_BETTER.has(c.recordType) ? c.value < prev : c.value > prev;
  });
}
