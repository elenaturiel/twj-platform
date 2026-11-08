import { allergensFromOff } from "./allergens";

/** Producto tal como lo devuelve la API de Open Food Facts (solo los campos que usamos). */
export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  quantity?: string;
  product_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
  allergens_tags?: string[];
  categories_tags_es?: string[];
};

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

/**
 * Convierte un producto de Open Food Facts en un borrador de alimento.
 * Los datos son colaborativos: el alimento entra SIN VERIFICAR (source = off).
 * Si OFF no tiene un dato, queda vacío (nunca se rellena a ojo).
 */
export function offToFood(p: OffProduct) {
  const n = p.nutriments ?? {};
  const kcal =
    num(n["energy-kcal_100g"]) ??
    (num(n["energy_100g"]) != null ? Math.round((num(n["energy_100g"])! / 4.184) * 100) / 100 : null);
  const pack = num(p.product_quantity);
  return {
    name: (p.product_name_es || p.product_name || "").trim().slice(0, 160),
    brand: p.brands?.split(",")[0]?.trim() || null,
    kcal,
    protein_g: num(n["proteins_100g"]),
    carbs_g: num(n["carbohydrates_100g"]),
    fat_g: num(n["fat_100g"]),
    fiber_g: num(n["fiber_100g"]),
    sugar_g: num(n["sugars_100g"]),
    salt_g: num(n["salt_100g"]),
    pack_size_g: pack && pack > 0 ? pack : null,
    allergens: allergensFromOff(p.allergens_tags),
    off_barcode: p.code ?? null,
    source: "off" as const,
    verified: false,
  };
}
