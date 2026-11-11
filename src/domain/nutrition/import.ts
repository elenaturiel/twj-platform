import { DAY_ALIASES, normalize } from "@/domain/training/import";
import type { Slot } from "./macros";

/**
 * Importador de menús desde la pestaña «Dieta» de la plantilla de Excel.
 * Cada fila = un alimento de una comida. Las cabeceras son fijas (las de la plantilla),
 * aunque se aceptan variantes razonables («Gramos», «Almuerzo», «Miercoles»…).
 */
export const DIET_HEADERS = [
  "Semana",
  "Día",
  "Comida",
  "Plato",
  "Alimento",
  "Cantidad (g)",
  "Unidades",
  "Notas",
] as const;

type DietField = "week" | "day" | "slot" | "title" | "food" | "grams" | "units" | "notes";
const HEADER_ALIASES: Record<DietField, string[]> = {
  week: ["semana", "week", "sem"],
  day: ["dia", "day"],
  slot: ["comida", "momento", "toma", "slot"],
  title: ["plato", "receta", "titulo"],
  food: ["alimento", "ingrediente", "producto", "food"],
  grams: ["cantidad g", "cantidad", "gramos", "g", "peso g", "peso"],
  units: ["unidades", "uds", "unidad", "ud"],
  notes: ["notas", "observaciones", "comentarios"],
};

export const SLOT_ALIASES: Record<string, Slot> = {
  desayuno: "breakfast",
  breakfast: "breakfast",
  "media manana": "snack",
  almuerzo: "lunch",
  comida: "lunch",
  lunch: "lunch",
  merienda: "snack",
  snack: "snack",
  tentempie: "snack",
  cena: "dinner",
  dinner: "dinner",
  extra: "extra",
  otro: "extra",
  "pre entreno": "extra",
  "post entreno": "extra",
  preentreno: "extra",
  postentreno: "extra",
  recena: "extra",
};

/** Opciones del desplegable «Comida» de la plantilla (todas se reconocen). */
export const SLOT_CHOICES = [
  "Desayuno",
  "Media mañana",
  "Comida",
  "Merienda",
  "Cena",
  "Pre entreno",
  "Post entreno",
  "Extra",
];

export type DietRowError = { row: number; message: string };
export type ParsedMealItem = { food: string; grams: number | null; units: number | null; notes: string | null };
export type ParsedMeal = { slot: Slot; title: string | null; items: ParsedMealItem[] };
export type ParsedDietDay = { dayIndex: number; meals: ParsedMeal[] };
export type ParsedDietWeek = { weekIndex: number; days: ParsedDietDay[] };

/** Cabecera del Excel → campo interno */
function mapHeaders(headers: string[]) {
  const map: Partial<Record<DietField, string>> = {};
  for (const field of Object.keys(HEADER_ALIASES) as DietField[]) {
    const hit = headers.find((h) => HEADER_ALIASES[field].includes(normalize(h)) && !Object.values(map).includes(h));
    if (hit) map[field] = hit;
  }
  return map;
}

/** «120», «120 g», «120,5» → 120.5; vacío → null; texto raro → "invalid" */
function quantity(raw: string): number | null | "invalid" {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s*(g|gr|grs|gramos|uds?|unidades?)\.?$/, "")
    .replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : "invalid";
}

export function parseDietRows(rows: Record<string, unknown>[], headers: string[]) {
  const map = mapHeaders(headers);
  const errors: DietRowError[] = [];
  for (const [field, label] of [
    ["day", "Día"],
    ["slot", "Comida"],
    ["food", "Alimento"],
  ] as const) {
    if (!map[field]) errors.push({ row: 0, message: `Falta la columna «${label}» en la pestaña Dieta` });
  }
  if (!map.grams && !map.units)
    errors.push({ row: 0, message: "Falta la columna «Cantidad (g)» o «Unidades» en la pestaña Dieta" });
  if (errors.length) return { weeks: [] as ParsedDietWeek[], errors, foods: [] as string[], rowCount: 0 };

  const get = (row: Record<string, unknown>, f: DietField) => {
    const h = map[f];
    const v = h ? row[h] : "";
    return v === null || v === undefined ? "" : String(v).trim();
  };

  const weeks = new Map<number, ParsedDietWeek>();
  const foods = new Map<string, string>(); // normalizado → como lo escribió Jaime
  let rowCount = 0;
  rows.forEach((row, i) => {
    const n = i + 2; // fila 1 = cabeceras
    if (Object.values(row).every((v) => v === null || v === undefined || String(v).trim() === "")) return;
    rowCount++;
    const err = (message: string) => errors.push({ row: n, message });

    const weekRaw = get(row, "week");
    const week = weekRaw ? Number(weekRaw) : 1;
    if (!Number.isInteger(week) || week < 1 || week > 12) err(`Semana no válida: «${weekRaw}» (1–12)`);

    const dayRaw = get(row, "day");
    const dayIndex = DAY_ALIASES[normalize(dayRaw)];
    if (!dayRaw) err("Falta el día");
    else if (dayIndex === undefined) err(`Día no reconocido: «${dayRaw}» (Lunes…Domingo)`);

    const slotRaw = get(row, "slot");
    const slot = SLOT_ALIASES[normalize(slotRaw)];
    if (!slotRaw) err("Falta la comida (Desayuno, Comida, Merienda, Cena…)");
    else if (!slot) err(`Comida no reconocida: «${slotRaw}» (Desayuno, Media mañana, Comida, Merienda, Cena, Extra)`);

    const food = get(row, "food").slice(0, 160);
    if (!food) err("Falta el alimento");

    const grams = quantity(get(row, "grams"));
    const units = quantity(get(row, "units"));
    if (grams === "invalid") err(`Cantidad no válida: «${get(row, "grams")}» (gramos, por ejemplo 120)`);
    if (units === "invalid") err(`Unidades no válidas: «${get(row, "units")}» (por ejemplo 2)`);
    if (grams === null && units === null) err("Pon la cantidad en gramos o en unidades");

    if (
      errors.some((e) => e.row === n) ||
      dayIndex === undefined ||
      !slot ||
      grams === "invalid" ||
      units === "invalid"
    )
      return;

    const w = weeks.get(week - 1) ?? { weekIndex: week - 1, days: [] };
    weeks.set(week - 1, w);
    let d = w.days.find((x) => x.dayIndex === dayIndex);
    if (!d) {
      d = { dayIndex, meals: [] };
      w.days.push(d);
    }
    // «Media mañana» se guarda como tentempié con ese título, para distinguirla de la merienda
    const title = get(row, "title").slice(0, 120) || (normalize(slotRaw) === "media manana" ? "Media mañana" : null);
    // Mismo día + misma comida + mismo plato = la misma comida del menú
    let meal = d.meals.find((m) => m.slot === slot && m.title === title);
    if (!meal) {
      meal = { slot, title, items: [] };
      d.meals.push(meal);
    }
    meal.items.push({ food, grams, units, notes: get(row, "notes").slice(0, 300) || null });
    if (!foods.has(normalize(food))) foods.set(normalize(food), food);
  });

  // Las comidas de cada día quedan en el orden en que Jaime las escribió
  const result = [...weeks.values()]
    .sort((a, z) => a.weekIndex - z.weekIndex)
    .map((w) => ({ ...w, days: w.days.sort((a, z) => a.dayIndex - z.dayIndex) }));
  return { weeks: errors.length ? [] : result, errors, foods: [...foods.values()], rowCount };
}
