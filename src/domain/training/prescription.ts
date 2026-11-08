import { z } from "zod";
import { formatDuration, formatPace } from "./time";

export const MODALITIES = ["gym", "functional", "running", "hyrox"] as const;
export type Modality = (typeof MODALITIES)[number];

export const MODALITY_LABELS: Record<Modality, string> = {
  gym: "Gym",
  functional: "Funcional",
  running: "Running",
  hyrox: "HYROX",
};

export const FORMATS = {
  straight: "Series",
  superset: "Superserie",
  circuit: "Circuito",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For time",
  tabata: "Tabata",
  rounds: "Por rondas",
  run: "Carrera",
  hyrox_sim: "Simulacro HYROX",
  hyrox_stations: "Estaciones HYROX",
} as const;
export type Format = keyof typeof FORMATS;

export const FORMATS_BY_MODALITY: Record<Modality, Format[]> = {
  gym: ["straight", "superset", "circuit"],
  functional: ["amrap", "emom", "for_time", "tabata", "rounds", "circuit"],
  running: ["run"],
  hyrox: ["hyrox_stations", "hyrox_sim", "for_time", "rounds"],
};

const num = z.coerce.number();
const optNum = z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), num.optional());
const optStr = z.preprocess((v) => (v === "" || v === null ? undefined : v), z.string().max(60).optional());

/** Parámetros de una parte (bloque) de la sesión. */
export const partParamsSchema = z.object({
  rounds: optNum, // rondas (rounds, circuit, for_time)
  time_cap_s: optNum, // límite de tiempo (amrap, for_time)
  work_s: optNum, // tabata / intervalos
  rest_s: optNum,
  every_s: optNum, // emom: cada X segundos
  minutes: optNum, // emom / amrap total
  scaling: optStr, // escalado (funcional)
  category: optStr, // categoría HYROX (Open, Pro, Dobles…)
});
export type PartParams = z.infer<typeof partParamsSchema>;

/** Prescripción de un ítem. Un único esquema flexible validado por modalidad en la UI. */
export const prescriptionSchema = z.object({
  sets: optNum,
  reps: optStr, // "8", "8-10", "AMRAP"
  load_kg: optNum,
  pct_rm: optNum,
  rpe: optNum,
  tempo: optStr, // "3-1-1-0"
  rest_s: optNum,
  // funcional
  cal: optNum,
  // running / hyrox
  distance_m: optNum,
  duration_s: optNum,
  pace_min_s: optNum, // ritmo objetivo (s/km), rango
  pace_max_s: optNum,
  hr_zone: optStr, // "Z2"
  run_type: z
    .enum(["rodaje", "series", "tempo", "fartlek", "tirada_larga", "calentamiento", "vuelta_calma"])
    .optional(),
  repeat: optNum, // series: 6 x 400 m
  station_key: optStr,
  target_split_s: optNum,
});
export type Prescription = z.infer<typeof prescriptionSchema>;

/** Texto corto de la prescripción: "4 × 8-10 · 60 kg · RPE 8 · desc. 2:00" */
export function summarizePrescription(p: Prescription): string {
  const out: string[] = [];
  if (p.repeat && (p.distance_m || p.duration_s)) {
    out.push(`${p.repeat} × ${p.distance_m ? `${p.distance_m} m` : formatDuration(p.duration_s)}`);
  } else {
    if (p.sets && p.reps) out.push(`${p.sets} × ${p.reps}`);
    else if (p.sets) out.push(`${p.sets} series`);
    else if (p.reps) out.push(`${p.reps} reps`);
    if (p.distance_m)
      out.push(p.distance_m >= 1000 ? `${(p.distance_m / 1000).toLocaleString("es-ES")} km` : `${p.distance_m} m`);
    if (p.duration_s) out.push(formatDuration(p.duration_s));
  }
  if (p.cal) out.push(`${p.cal} cal`);
  if (p.load_kg) out.push(`${p.load_kg.toLocaleString("es-ES")} kg`);
  if (p.pct_rm) out.push(`${p.pct_rm} % RM`);
  if (p.rpe) out.push(`RPE ${p.rpe}`);
  if (p.tempo) out.push(`tempo ${p.tempo}`);
  if (p.pace_min_s && p.pace_max_s)
    out.push(`${formatPace(p.pace_min_s).replace("/km", "")}–${formatPace(p.pace_max_s)}`);
  else if (p.pace_min_s) out.push(formatPace(p.pace_min_s));
  if (p.hr_zone) out.push(p.hr_zone);
  if (p.target_split_s) out.push(`objetivo ${formatDuration(p.target_split_s)}`);
  if (p.rest_s) out.push(`desc. ${formatDuration(p.rest_s)}`);
  return out.join(" · ");
}

export function summarizePart(format: Format, params: PartParams): string {
  const label = FORMATS[format];
  const bits: string[] = [];
  if (format === "amrap" && params.minutes) bits.push(`${params.minutes} min`);
  if (format === "emom" && params.minutes)
    bits.push(
      `${params.minutes} min${params.every_s && params.every_s !== 60 ? ` cada ${formatDuration(params.every_s)}` : ""}`,
    );
  if (format === "tabata") bits.push(`${params.rounds ?? 8} × ${params.work_s ?? 20}"/${params.rest_s ?? 10}"`);
  if ((format === "rounds" || format === "circuit" || format === "for_time") && params.rounds)
    bits.push(`${params.rounds} rondas`);
  if (params.time_cap_s) bits.push(`cap ${formatDuration(params.time_cap_s)}`);
  if (params.category) bits.push(params.category);
  if (params.scaling) bits.push(`escalado: ${params.scaling}`);
  return [label, ...bits].join(" · ");
}

/** Número de series a registrar para un ítem (mínimo 1). */
export function plannedSets(p: Prescription): number {
  return Math.max(1, Math.min(20, Math.round(p.repeat ?? p.sets ?? 1)));
}
