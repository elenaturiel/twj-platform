/** "4:30" → 270 · "1:02:15" → 3735 · "90" → 90. Devuelve null si no se entiende. */
export function parseDuration(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(",", ".");
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s));
  const parts = s.split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n >= 60)) return null;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** 270 → "4:30" · 3735 → "1:02:15" */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds)) return "—";
  const t = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Ritmo (s/km) a partir de distancia y tiempo. */
export function paceSecondsPerKm(distanceM: number, durationS: number): number | null {
  if (!distanceM || !durationS || distanceM <= 0 || durationS <= 0) return null;
  return Math.round(durationS / (distanceM / 1000));
}

export function formatPace(secondsPerKm: number | null | undefined): string {
  return secondsPerKm ? `${formatDuration(secondsPerKm)}/km` : "—";
}
