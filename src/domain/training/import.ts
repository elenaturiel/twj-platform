import { FORMATS, FORMATS_BY_MODALITY, type Format, type Modality, type Prescription } from "./prescription";
import { parseDuration } from "./time";

/**
 * Importador de rutinas desde Excel/CSV. Cada fila = un ejercicio de una sesión.
 * Las columnas se mapean en el asistente; estos son los campos internos.
 */
export const IMPORT_FIELDS = {
  block: { label: "Bloque", required: true, example: "Bloque 1 · Fuerza" },
  week: { label: "Semana", required: true, example: "1" },
  day: { label: "Día", required: false, example: "Lunes" },
  session: { label: "Sesión", required: true, example: "Pierna" },
  modality: { label: "Modalidad", required: false, example: "gym" },
  format: { label: "Formato", required: false, example: "series" },
  exercise: { label: "Ejercicio", required: true, example: "Sentadilla trasera" },
  sets: { label: "Series", required: false, example: "4" },
  reps: { label: "Reps", required: false, example: "8-10" },
  load_kg: { label: "Carga (kg)", required: false, example: "60" },
  rpe: { label: "RPE", required: false, example: "8" },
  rest: { label: "Descanso", required: false, example: "2:00" },
  tempo: { label: "Tempo", required: false, example: "3-1-1-0" },
  distance_m: { label: "Distancia (m)", required: false, example: "" },
  duration: { label: "Duración", required: false, example: "" },
  pace_min: { label: "Ritmo mín (/km)", required: false, example: "" },
  pace_max: { label: "Ritmo máx (/km)", required: false, example: "" },
  hr_zone: { label: "Zona FC", required: false, example: "" },
  notes: { label: "Notas", required: false, example: "Controla la bajada" },
} as const;
export type ImportField = keyof typeof IMPORT_FIELDS;
export type ColumnMapping = Partial<Record<ImportField, string>>; // campo → cabecera del Excel

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Sugerencia automática de mapeo por parecido de cabeceras. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const aliases: Record<ImportField, string[]> = {
    block: ["bloque", "mesociclo", "block"],
    week: ["semana", "week", "sem"],
    day: ["dia", "day"],
    session: ["sesion", "entreno", "session", "rutina"],
    modality: ["modalidad", "tipo", "modality"],
    format: ["formato", "format"],
    exercise: ["ejercicio", "exercise", "nombre"],
    sets: ["series", "sets"],
    reps: ["reps", "repeticiones"],
    load_kg: ["carga", "carga kg", "peso", "kg"],
    rpe: ["rpe", "rir"],
    rest: ["descanso", "rest"],
    tempo: ["tempo", "cadencia"],
    distance_m: ["distancia", "distancia m", "metros"],
    duration: ["duracion", "tiempo"],
    pace_min: ["ritmo min km", "ritmo min", "ritmo minimo", "ritmo"],
    pace_max: ["ritmo max km", "ritmo max", "ritmo maximo"],
    hr_zone: ["zona", "zona fc", "fc"],
    notes: ["notas", "observaciones", "comentarios"],
  };
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const field of Object.keys(aliases) as ImportField[]) {
    const hit = headers.find((h) => !used.has(h) && aliases[field].includes(normalize(h)));
    if (hit) {
      mapping[field] = hit;
      used.add(hit);
    }
  }
  return mapping;
}

const DAY_ALIASES: Record<string, number> = {
  lunes: 0,
  l: 0,
  lu: 0,
  "1": 0,
  martes: 1,
  m: 1,
  ma: 1,
  "2": 1,
  miercoles: 2,
  x: 2,
  mi: 2,
  "3": 2,
  jueves: 3,
  j: 3,
  ju: 3,
  "4": 3,
  viernes: 4,
  v: 4,
  vi: 4,
  "5": 4,
  sabado: 5,
  s: 5,
  sa: 5,
  "6": 5,
  domingo: 6,
  d: 6,
  do: 6,
  "7": 6,
};
const MODALITY_ALIASES: Record<string, Modality> = {
  gym: "gym",
  fuerza: "gym",
  gimnasio: "gym",
  hipertrofia: "gym",
  funcional: "functional",
  functional: "functional",
  crossfit: "functional",
  wod: "functional",
  running: "running",
  carrera: "running",
  correr: "running",
  hyrox: "hyrox",
};
const FORMAT_ALIASES: Record<string, Format> = {
  series: "straight",
  normal: "straight",
  straight: "straight",
  superserie: "superset",
  superset: "superset",
  circuito: "circuit",
  amrap: "amrap",
  emom: "emom",
  "for time": "for_time",
  fortime: "for_time",
  tabata: "tabata",
  rondas: "rounds",
  "por rondas": "rounds",
  carrera: "run",
  run: "run",
  simulacro: "hyrox_sim",
  estaciones: "hyrox_stations",
};

export type RowError = { row: number; field: ImportField | null; message: string };

export type ParsedItem = { exercise: string; prescription: Prescription; notes: string | null };
export type ParsedPart = { modality: Modality; format: Format; items: ParsedItem[] };
export type ParsedSession = { title: string; dayIndex: number | null; parts: ParsedPart[] };
export type ParsedWeek = { weekIndex: number; sessions: ParsedSession[] };
export type ParsedBlock = { name: string; weeks: ParsedWeek[] };

function cell(row: Record<string, unknown>, mapping: ColumnMapping, field: ImportField): string {
  const header = mapping[field];
  if (!header) return "";
  const v = row[header];
  return v === null || v === undefined ? "" : String(v).trim();
}

function numberCell(raw: string): number | undefined | "invalid" {
  if (!raw) return undefined;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

/**
 * Valida todas las filas y, si no hay errores, devuelve los bloques listos para
 * crear. Errores fila a fila (la fila 2 es la primera de datos en Excel).
 */
export function parseWorkoutRows(rows: Record<string, unknown>[], mapping: ColumnMapping) {
  const errors: RowError[] = [];
  for (const [field, meta] of Object.entries(IMPORT_FIELDS) as [ImportField, (typeof IMPORT_FIELDS)[ImportField]][]) {
    if (meta.required && !mapping[field])
      errors.push({ row: 0, field, message: `Falta asignar la columna «${meta.label}»` });
  }
  if (errors.length) return { blocks: [] as ParsedBlock[], errors, rowCount: rows.length };

  const blocks = new Map<string, ParsedBlock>();
  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const allEmpty = Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === "");
    if (allEmpty) return;
    const err = (field: ImportField | null, message: string) => errors.push({ row: rowNumber, field, message });

    const blockName = cell(row, mapping, "block");
    const weekRaw = cell(row, mapping, "week");
    const sessionTitle = cell(row, mapping, "session");
    const exercise = cell(row, mapping, "exercise");
    if (!blockName) err("block", "Falta el bloque");
    if (!sessionTitle) err("session", "Falta la sesión");
    if (!exercise) err("exercise", "Falta el ejercicio");
    const week = Number(weekRaw);
    if (!Number.isInteger(week) || week < 1 || week > 52) err("week", `Semana no válida: «${weekRaw}» (1–52)`);

    const dayRaw = normalize(cell(row, mapping, "day"));
    let dayIndex: number | null = null;
    if (dayRaw) {
      if (dayRaw in DAY_ALIASES) dayIndex = DAY_ALIASES[dayRaw]!;
      else err("day", `Día no reconocido: «${cell(row, mapping, "day")}»`);
    }

    const modalityRaw = normalize(cell(row, mapping, "modality"));
    const modality: Modality | undefined = modalityRaw ? MODALITY_ALIASES[modalityRaw] : "gym";
    if (!modality)
      err("modality", `Modalidad no reconocida: «${cell(row, mapping, "modality")}» (gym, funcional, running, hyrox)`);

    const formatRaw = normalize(cell(row, mapping, "format"));
    let format: Format | undefined = formatRaw ? FORMAT_ALIASES[formatRaw] : undefined;
    if (formatRaw && !format) err("format", `Formato no reconocido: «${cell(row, mapping, "format")}»`);
    if (modality && !format) format = FORMATS_BY_MODALITY[modality][0];
    if (modality && format && !FORMATS_BY_MODALITY[modality].includes(format)) {
      err("format", `El formato «${FORMATS[format]}» no encaja con ${modality}`);
    }

    const prescription: Prescription = {};
    for (const [field, key] of [
      ["sets", "sets"],
      ["load_kg", "load_kg"],
      ["rpe", "rpe"],
      ["distance_m", "distance_m"],
    ] as const) {
      const v = numberCell(cell(row, mapping, field));
      if (v === "invalid") err(field, `${IMPORT_FIELDS[field].label} no es un número: «${cell(row, mapping, field)}»`);
      else if (v !== undefined) prescription[key] = v;
    }
    if (prescription.rpe !== undefined && prescription.rpe > 10) err("rpe", "El RPE va de 0 a 10");
    const reps = cell(row, mapping, "reps");
    if (reps) prescription.reps = reps.slice(0, 20);
    const tempo = cell(row, mapping, "tempo");
    if (tempo) prescription.tempo = tempo.slice(0, 20);
    const zone = cell(row, mapping, "hr_zone");
    if (zone) prescription.hr_zone = zone.slice(0, 10);
    for (const [field, key] of [
      ["rest", "rest_s"],
      ["duration", "duration_s"],
      ["pace_min", "pace_min_s"],
      ["pace_max", "pace_max_s"],
    ] as const) {
      const raw = cell(row, mapping, field);
      if (!raw) continue;
      const s = parseDuration(raw);
      if (s === null) err(field, `${IMPORT_FIELDS[field].label} no se entiende: «${raw}» (usa m:ss)`);
      else prescription[key] = s;
    }

    if (errors.some((e) => e.row === rowNumber) || !modality || !format) return;

    const block = blocks.get(blockName) ?? { name: blockName, weeks: [] };
    blocks.set(blockName, block);
    let w = block.weeks.find((x) => x.weekIndex === week - 1);
    if (!w) {
      w = { weekIndex: week - 1, sessions: [] };
      block.weeks.push(w);
    }
    let s = w.sessions.find((x) => x.title === sessionTitle);
    if (!s) {
      s = { title: sessionTitle, dayIndex, parts: [] };
      w.sessions.push(s);
    }
    // Filas seguidas con la misma modalidad y formato van a la misma parte
    let part = s.parts.at(-1);
    if (!part || part.modality !== modality || part.format !== format) {
      part = { modality, format, items: [] };
      s.parts.push(part);
    }
    part.items.push({ exercise, prescription, notes: cell(row, mapping, "notes") || null });
  });

  const result = [...blocks.values()].map((b) => ({ ...b, weeks: b.weeks.sort((a, z) => a.weekIndex - z.weekIndex) }));
  return { blocks: errors.length ? [] : result, errors, rowCount: rows.length };
}

/** Filas de ejemplo para la plantilla descargable. */
export const TEMPLATE_ROWS: Record<string, string>[] = [
  {
    Bloque: "Bloque 1 · Fuerza",
    Semana: "1",
    Día: "Lunes",
    Sesión: "Pierna",
    Modalidad: "gym",
    Formato: "series",
    Ejercicio: "Sentadilla trasera",
    Series: "4",
    Reps: "6-8",
    "Carga (kg)": "70",
    RPE: "8",
    Descanso: "2:30",
    Tempo: "3-1-1-0",
    "Distancia (m)": "",
    Duración: "",
    "Ritmo mín (/km)": "",
    "Ritmo máx (/km)": "",
    "Zona FC": "",
    Notas: "Profundidad paralela",
  },
  {
    Bloque: "Bloque 1 · Fuerza",
    Semana: "1",
    Día: "Lunes",
    Sesión: "Pierna",
    Modalidad: "gym",
    Formato: "series",
    Ejercicio: "Peso muerto rumano",
    Series: "3",
    Reps: "10",
    "Carga (kg)": "50",
    RPE: "7",
    Descanso: "1:30",
    Tempo: "",
    "Distancia (m)": "",
    Duración: "",
    "Ritmo mín (/km)": "",
    "Ritmo máx (/km)": "",
    "Zona FC": "",
    Notas: "",
  },
  {
    Bloque: "Bloque 1 · Fuerza",
    Semana: "1",
    Día: "Miércoles",
    Sesión: "Carrera suave",
    Modalidad: "running",
    Formato: "carrera",
    Ejercicio: "Rodaje suave",
    Series: "",
    Reps: "",
    "Carga (kg)": "",
    RPE: "",
    Descanso: "",
    Tempo: "",
    "Distancia (m)": "6000",
    Duración: "",
    "Ritmo mín (/km)": "6:00",
    "Ritmo máx (/km)": "6:30",
    "Zona FC": "Z2",
    Notas: "Conversacional",
  },
  {
    Bloque: "Bloque 1 · Fuerza",
    Semana: "1",
    Día: "Viernes",
    Sesión: "WOD",
    Modalidad: "funcional",
    Formato: "amrap",
    Ejercicio: "Kettlebell swing",
    Series: "",
    Reps: "15",
    "Carga (kg)": "16",
    RPE: "",
    Descanso: "",
    Tempo: "",
    "Distancia (m)": "",
    Duración: "",
    "Ritmo mín (/km)": "",
    "Ritmo máx (/km)": "",
    "Zona FC": "",
    Notas: "AMRAP 12 min",
  },
];
export const TEMPLATE_HEADERS = Object.keys(TEMPLATE_ROWS[0]!);
