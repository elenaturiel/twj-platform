export type FoodNutrients = {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  unit_grams: number | null;
  verified: boolean;
};
export type Portion = { quantity_g: number | null; quantity_units: number | null };
export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  incomplete: boolean;
  unverified: boolean;
};

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, incomplete: false, unverified: false };

/** Gramos de una ración (por peso o por unidades si el alimento tiene peso por unidad). */
export function portionGrams(food: Pick<FoodNutrients, "unit_grams">, p: Portion): number | null {
  if (p.quantity_g != null) return p.quantity_g;
  if (p.quantity_units != null && food.unit_grams != null) return p.quantity_units * food.unit_grams;
  return null;
}

/**
 * Macros de una ración. Si falta algún dato, no se inventa: cuenta lo que hay y
 * marca el total como incompleto (la UI lo indica).
 */
export function itemMacros(food: FoodNutrients, p: Portion): Macros {
  const g = portionGrams(food, p);
  if (g == null) return { ...ZERO, incomplete: true, unverified: !food.verified };
  const f = g / 100;
  const missing = [food.kcal, food.protein_g, food.carbs_g, food.fat_g].some((v) => v == null);
  return {
    kcal: (food.kcal ?? 0) * f,
    protein: (food.protein_g ?? 0) * f,
    carbs: (food.carbs_g ?? 0) * f,
    fat: (food.fat_g ?? 0) * f,
    incomplete: missing,
    unverified: !food.verified,
  };
}

export function sumMacros(list: Macros[]): Macros {
  return list.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      incomplete: acc.incomplete || m.incomplete,
      unverified: acc.unverified || m.unverified,
    }),
    ZERO,
  );
}

export function roundMacros(m: Macros) {
  return {
    ...m,
    kcal: Math.round(m.kcal),
    protein: Math.round(m.protein),
    carbs: Math.round(m.carbs),
    fat: Math.round(m.fat),
  };
}

export const SLOT_LABELS = {
  breakfast: "Desayuno",
  lunch: "Comida",
  snack: "Merienda",
  dinner: "Cena",
  extra: "Extra",
} as const;
export type Slot = keyof typeof SLOT_LABELS;
export const SLOTS = Object.keys(SLOT_LABELS) as Slot[];
