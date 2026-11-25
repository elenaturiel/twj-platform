import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Slot } from "@/domain/nutrition/macros";

export type FoodRow = {
  id: string;
  name: string;
  brand: string | null;
  supermarket_section: string;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  unit_name: string | null;
  unit_grams: number | null;
  pack_size_g: number | null;
  price_cents: number | null;
  allergens: string[];
  verified: boolean;
  source: string;
};
export type ItemNode = {
  id: string;
  food_id: string;
  quantity_g: number | null;
  quantity_units: number | null;
  notes: string | null;
  sort_order: number;
  foods: FoodRow;
};
export type MealNode = {
  id: string;
  slot: Slot;
  title: string | null;
  sort_order: number;
  notes: string | null;
  meal_items: ItemNode[];
};
export type DayNode = { id: string; day_index: number; notes: string | null; meals: MealNode[] };
export type PlanNode = {
  id: string;
  client_id: string | null;
  template_id: string | null;
  week_start: string | null;
  status: "draft" | "published" | "archived";
  notes: string | null;
  meal_plan_days: DayNode[];
};

const FOOD =
  "id, name, brand, supermarket_section, kcal, protein_g, carbs_g, fat_g, unit_name, unit_grams, pack_size_g, price_cents, allergens, verified, source";
const TREE = `id, client_id, template_id, week_start, status, notes,
  meal_plan_days(id, day_index, notes, meals(id, slot, title, sort_order, notes, meal_items(id, food_id, quantity_g, quantity_units, notes, sort_order, foods(${FOOD}))))`;

const SLOT_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3, extra: 4 };

const toNum = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function normalize(p: PlanNode): PlanNode {
  p.meal_plan_days.sort((a, b) => a.day_index - b.day_index);
  for (const d of p.meal_plan_days) {
    d.meals.sort((a, b) => SLOT_ORDER[a.slot]! - SLOT_ORDER[b.slot]! || a.sort_order - b.sort_order);
    for (const m of d.meals) {
      m.meal_items.sort((a, b) => a.sort_order - b.sort_order);
      for (const i of m.meal_items) {
        i.quantity_g = toNum(i.quantity_g);
        i.quantity_units = toNum(i.quantity_units);
        const f = i.foods;
        for (const k of ["kcal", "protein_g", "carbs_g", "fat_g", "unit_grams", "pack_size_g"] as const)
          (f as Record<string, unknown>)[k] = toNum(f[k]);
      }
    }
  }
  return p;
}

export async function getPlanTree(planId: string): Promise<PlanNode | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("meal_plans").select(TREE).eq("id", planId).maybeSingle();
  return data ? normalize(data as unknown as PlanNode) : null;
}

export async function getClientPlanForWeek(clientId: string, weekStart: string): Promise<PlanNode | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_plans")
    .select(TREE)
    .eq("client_id", clientId)
    .eq("week_start", weekStart)
    .maybeSingle();
  return data ? normalize(data as unknown as PlanNode) : null;
}

/** Último menú publicado hasta esta semana (si esta semana no hay, se muestra el anterior). */
export async function getCurrentPublishedPlan(clientId: string, weekStart: string): Promise<PlanNode | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_plans")
    .select(TREE)
    .eq("client_id", clientId)
    .eq("status", "published")
    .lte("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? normalize(data as unknown as PlanNode) : null;
}

export async function getFoods(includeInactive = false): Promise<FoodRow[]> {
  const supabase = await createClient();
  let q = supabase.from("foods").select(FOOD).order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []).map((f) => ({
    ...f,
    kcal: toNum(f.kcal),
    protein_g: toNum(f.protein_g),
    carbs_g: toNum(f.carbs_g),
    fat_g: toNum(f.fat_g),
    unit_grams: toNum(f.unit_grams),
    pack_size_g: toNum(f.pack_size_g),
  })) as FoodRow[];
}
