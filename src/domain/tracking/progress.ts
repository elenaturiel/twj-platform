/**
 * Progreso (0–100) desde el valor inicial hasta el objetivo. Sirve para subir
 * (pasos) o bajar (cintura). Null si no hay datos suficientes.
 */
export function progressToTarget(start: number | null, current: number | null, target: number | null): number | null {
  if (start == null || current == null || target == null) return null;
  if (start === target) return current === target ? 100 : 0;
  const pct = ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

/** Adherencia a los entrenos: hechos / planificados hasta hoy. */
export function adherencePercent(planned: number, done: number): number | null {
  if (planned <= 0) return null;
  return Math.min(100, Math.round((done / planned) * 100));
}

/** Variación entre el primer y el último valor de una serie ordenada por fecha. */
export function seriesChange(points: { value: number }[]) {
  if (points.length < 2) return null;
  const first = points[0]!.value;
  const last = points.at(-1)!.value;
  return {
    absolute: Math.round((last - first) * 100) / 100,
    percent: first ? Math.round(((last - first) / first) * 1000) / 10 : null,
  };
}
