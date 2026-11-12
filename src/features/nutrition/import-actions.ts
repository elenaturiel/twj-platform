"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/domain/billing/renewal";
import { normalize } from "@/domain/training/import";
import type { ParsedDietWeek } from "@/domain/nutrition/import";

export type DietImportResult =
  { ok: true; plans: number; newFoods: string[]; planId: string } | { ok: false; error: string };

const itemSchema = z.object({
  food: z.string().trim().min(1).max(160),
  grams: z.number().positive().max(100000).nullable(),
  units: z.number().positive().max(1000).nullable(),
  notes: z.string().max(300).nullable(),
});
const weeksSchema = z
  .array(
    z.object({
      weekIndex: z.number().int().min(0).max(11),
      days: z.array(
        z.object({
          dayIndex: z.number().int().min(0).max(6),
          meals: z.array(
            z.object({
              slot: z.enum(["breakfast", "lunch", "snack", "dinner", "extra"]),
              title: z.string().max(120).nullable(),
              items: z.array(itemSchema).min(1).max(40),
            }),
          ),
        }),
      ),
    }),
  )
  .min(1)
  .max(12);

/**
 * Crea los menús leídos de la pestaña «Dieta». Todo entra como BORRADOR: Jaime lo
 * revisa y publica. Los alimentos que no están en la base se crean sin datos
 * nutricionales (no se inventan) para completarlos después.
 */
export async function importDietPlan(input: {
  weeks: ParsedDietWeek[];
  clientId: string | null;
  weekStart: string | null; // lunes de la semana 1 (solo para clientes)
  templateName?: string;
  fileName: string;
}): Promise<DietImportResult> {
  const viewer = await requireScope("clients");
  const parsed = weeksSchema.safeParse(input.weeks);
  if (!parsed.success) return { ok: false, error: "El Excel no tiene un menú válido." };
  const weeks = parsed.data;
  if (input.clientId && !z.uuid().safeParse(input.clientId).success) return { ok: false, error: "Cliente no válido." };
  if (input.clientId && (!input.weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart)))
    return { ok: false, error: "Elige la semana en que empieza el menú." };
  if (input.clientId && new Date(`${input.weekStart}T12:00:00Z`).getUTCDay() !== 1)
    return { ok: false, error: "La semana tiene que empezar en lunes." };
  if (!input.clientId && weeks.length > 1)
    return { ok: false, error: "Una plantilla de menú es de una sola semana: deja solo la semana 1." };

  const supabase = await createClient();

  // Semanas que ya tienen menú: no se pisa nada
  const starts = weeks.map((w) => addDays(input.weekStart ?? "2000-01-03", w.weekIndex * 7));
  if (input.clientId) {
    const { data: existing } = await supabase
      .from("meal_plans")
      .select("week_start")
      .eq("client_id", input.clientId)
      .in("week_start", starts);
    if (existing?.length)
      return {
        ok: false,
        error: `Ya hay un menú para la semana del ${existing
          .map((e) => e.week_start)
          .sort()
          .join(", ")}. Bórralo o elige otra semana.`,
      };
  }

  // Alimentos: por nombre (sin mayúsculas ni tildes); los que faltan se crean sin datos
  const { data: library } = await supabase.from("foods").select("id, name").eq("is_active", true);
  const byName = new Map((library ?? []).map((f) => [normalize(f.name), f.id]));
  const wanted = new Map<string, string>();
  for (const w of weeks)
    for (const d of w.days) for (const m of d.meals) for (const it of m.items) wanted.set(normalize(it.food), it.food);
  const missing = [...wanted].filter(([k]) => !byName.has(k)).map(([, name]) => name);
  if (missing.length) {
    const { data: created, error } = await supabase
      .from("foods")
      .insert(missing.map((name) => ({ name, source: "manual" as const, verified: false })))
      .select("id, name");
    if (error || !created) return { ok: false, error: "No se han podido crear los alimentos nuevos." };
    for (const f of created) byName.set(normalize(f.name), f.id);
  }

  let firstPlanId = "";
  for (const [i, w] of weeks.entries()) {
    let templateId: string | null = null;
    if (!input.clientId) {
      const { data: t, error } = await supabase
        .from("meal_templates")
        .insert({ name: (input.templateName || input.fileName || "Menú").trim().slice(0, 80), created_by: viewer.id })
        .select("id")
        .single();
      if (error || !t) return { ok: false, error: "No se ha podido crear la plantilla de menú." };
      templateId = t.id;
    }
    const { data: plan, error } = await supabase
      .from("meal_plans")
      .insert({
        client_id: input.clientId,
        template_id: templateId,
        week_start: input.clientId ? starts[i]! : null,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !plan) return { ok: false, error: "No se ha podido crear el menú." };
    if (!firstPlanId) firstPlanId = plan.id;
    const { data: days } = await supabase
      .from("meal_plan_days")
      .insert(Array.from({ length: 7 }, (_, d) => ({ meal_plan_id: plan.id, client_id: input.clientId, day_index: d })))
      .select("id, day_index");
    const dayId = new Map((days ?? []).map((d) => [d.day_index, d.id]));

    for (const d of w.days) {
      for (const [order, m] of d.meals.entries()) {
        const { data: meal, error: mealError } = await supabase
          .from("meals")
          .insert({
            day_id: dayId.get(d.dayIndex)!,
            client_id: input.clientId,
            slot: m.slot,
            title: m.title,
            sort_order: order,
          })
          .select("id")
          .single();
        if (mealError || !meal) return { ok: false, error: "No se ha podido crear una comida." };
        const { error: itemsError } = await supabase.from("meal_items").insert(
          m.items.map((it, k) => ({
            meal_id: meal.id,
            client_id: input.clientId,
            food_id: byName.get(normalize(it.food))!,
            quantity_g: it.grams,
            quantity_units: it.units,
            notes: it.notes,
            sort_order: k,
          })),
        );
        if (itemsError) return { ok: false, error: "No se han podido guardar los alimentos de una comida." };
      }
    }
  }

  revalidatePath("/panel/biblioteca/menus");
  if (input.clientId) revalidatePath(`/panel/clientes/${input.clientId}/nutricion`);
  revalidatePath("/panel/biblioteca/alimentos");
  return { ok: true, plans: weeks.length, newFoods: missing, planId: firstPlanId };
}
