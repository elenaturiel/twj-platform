"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrigin } from "@/lib/request";
import { sendTemplateEmail } from "@/lib/email/send";
import { offToFood, type OffProduct } from "@/domain/nutrition/off";
import { getOffProduct, searchOff } from "./off.server";

export type NutritionResult = { ok: true; id?: string; message?: string } | { ok: false; error: string };
const fail = (error: string): NutritionResult => ({ ok: false, error });

function refresh(clientId?: string | null) {
  if (clientId) revalidatePath(`/panel/clientes/${clientId}/nutricion`, "layout");
  revalidatePath("/panel/biblioteca/menus", "layout");
  revalidatePath("/comida", "layout");
}

// ───────────────────────────── Alimentos ─────────────────────────────

const optNum = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(String(v).replace(",", "."))),
  z.number().min(0).nullable(),
);

const foodSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(160),
  brand: z.string().trim().max(80).nullable().default(null),
  category: z.string().trim().max(80).nullable().default(null),
  supermarket_section: z.string().trim().min(1).max(60).default("Otros"),
  kcal: optNum,
  protein_g: optNum,
  carbs_g: optNum,
  fat_g: optNum,
  fiber_g: optNum,
  sugar_g: optNum,
  salt_g: optNum,
  unit_name: z.string().trim().max(40).nullable().default(null),
  unit_grams: optNum,
  pack_size_g: optNum,
  price_euros: optNum,
  allergens: z.array(z.string()).default([]),
  verified: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export async function saveFood(input: z.input<typeof foodSchema>): Promise<NutritionResult> {
  const viewer = await requireScope("clients");
  const parsed = foodSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revisa el alimento.");
  const { id, price_euros, verified, ...rest } = parsed.data;
  const row = {
    ...rest,
    unit_grams: rest.unit_grams || null,
    pack_size_g: rest.pack_size_g || null,
    price_cents: price_euros == null ? null : Math.round(price_euros * 100),
    verified,
    verified_by: verified ? viewer.id : null,
    verified_at: verified ? new Date().toISOString() : null,
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("foods").update(row).eq("id", id).select("id").single()
    : await supabase
        .from("foods")
        .insert({ ...row, source: "manual" })
        .select("id")
        .single();
  if (error) return fail("No se ha podido guardar el alimento.");
  revalidatePath("/panel/biblioteca/alimentos");
  return { ok: true, id: data.id };
}

export async function searchOpenFoodFacts(term: string) {
  await requireScope("clients");
  const products = await searchOff(term);
  return products.map((p) => ({ ...offToFood(p), quantity: p.quantity ?? null }));
}

/** Importa un producto de Open Food Facts (por código de barras) como "sin verificar". */
export async function importOffProduct(barcode: string, section: string): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("foods").select("id").eq("off_barcode", barcode).maybeSingle();
  if (existing) return { ok: true, id: existing.id, message: "Ya estaba en la base." };
  const p = await getOffProduct(barcode);
  if (!p) return fail("No se ha encontrado en Open Food Facts.");
  const food = offToFood(p as OffProduct);
  if (!food.name) return fail("El producto no tiene nombre en Open Food Facts.");
  const { data, error } = await supabase
    .from("foods")
    .insert({ ...food, supermarket_section: section || "Otros" })
    .select("id")
    .single();
  if (error) return fail("No se ha podido importar.");
  revalidatePath("/panel/biblioteca/alimentos");
  return {
    ok: true,
    id: data.id,
    message: "Importado (sin verificar). Revisa los datos antes de marcarlo como verificado.",
  };
}

/** Importación CSV/Excel ya parseada en el navegador. Todo entra sin verificar. */
export async function importFoods(rows: z.input<typeof foodSchema>[]): Promise<NutritionResult & { created?: number }> {
  await requireScope("clients");
  const valid = rows
    .map((r) => foodSchema.safeParse({ ...r, verified: false }))
    .filter((r) => r.success)
    .map((r) => r.data!);
  if (!valid.length) return fail("No hay filas válidas.");
  const supabase = await createClient();
  const { error } = await supabase.from("foods").insert(
    valid.map(({ id: _drop, price_euros, ...r }) => {
      void _drop;
      return {
        ...r,
        price_cents: price_euros == null ? null : Math.round(price_euros * 100),
        source: "csv",
        verified: false,
      };
    }),
  );
  if (error) return fail("No se han podido importar los alimentos.");
  revalidatePath("/panel/biblioteca/alimentos");
  return { ok: true, created: valid.length };
}

// ───────────────────────────── Menús ─────────────────────────────

/** Crea el menú de una semana para un cliente (con los 7 días) o una plantilla. */
export async function createMealPlan(input: {
  clientId: string | null;
  weekStart: string | null;
  templateName?: string;
}): Promise<NutritionResult> {
  const viewer = await requireScope("clients");
  const supabase = await createClient();
  let templateId: string | null = null;
  if (!input.clientId) {
    const { data: t, error } = await supabase
      .from("meal_templates")
      .insert({ name: (input.templateName ?? "Menú").trim().slice(0, 80) || "Menú", created_by: viewer.id })
      .select("id")
      .single();
    if (error || !t) return fail("No se ha podido crear la plantilla.");
    templateId = t.id;
  }
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({ client_id: input.clientId, template_id: templateId, week_start: input.clientId ? input.weekStart : null })
    .select("id")
    .single();
  if (error || !plan)
    return fail(error?.code === "23505" ? "Ya hay un menú para esa semana." : "No se ha podido crear el menú.");
  await supabase
    .from("meal_plan_days")
    .insert(Array.from({ length: 7 }, (_, d) => ({ meal_plan_id: plan.id, client_id: input.clientId, day_index: d })));
  refresh(input.clientId);
  return { ok: true, id: plan.id };
}

/** Copia un menú: repetir otra semana, asignar una plantilla a un cliente o guardar como plantilla. */
export async function copyMealPlan(input: {
  planId: string;
  toClientId?: string | null;
  weekStart?: string | null;
  asTemplateName?: string | null;
}): Promise<NutritionResult> {
  const viewer = await requireScope("clients");
  const supabase = await createClient();
  let templateId: string | null = null;
  if (input.asTemplateName) {
    const { data: t } = await supabase
      .from("meal_templates")
      .insert({ name: input.asTemplateName.trim().slice(0, 80), created_by: viewer.id })
      .select("id")
      .single();
    templateId = t?.id ?? null;
    if (!templateId) return fail("No se ha podido crear la plantilla.");
  }
  const { data, error } = await supabase.rpc("copy_meal_plan", {
    p_plan: input.planId,
    p_client: (templateId ? null : (input.toClientId ?? null)) as string,
    p_template: templateId as string,
    p_week_start: (input.weekStart ?? null) as string,
  });
  if (error)
    return fail(
      error.message.includes("meal_plans_client_week_idx")
        ? "Ya hay un menú para esa semana."
        : "No se ha podido copiar el menú.",
    );
  refresh(input.toClientId ?? null);
  return { ok: true, id: data };
}

export async function setMealPlanStatus(
  planId: string,
  status: "draft" | "published" | "archived",
): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .update({ status })
    .eq("id", planId)
    .select("client_id, week_start, clients(profile_id, profiles(email, full_name))")
    .single();
  if (error || !plan) return fail("No se ha podido guardar.");
  if (status === "published" && plan.client_id && plan.clients) {
    const admin = createAdminClient();
    await admin.rpc("notify", {
      p_profile_id: plan.clients.profile_id,
      p_type: "menu_published",
      p_title: "Tienes menú nuevo",
      p_body: "Jaime ha publicado tu menú de la semana. Con lista de la compra incluida.",
      p_link: "/comida",
      p_client_id: plan.client_id,
    });
    const prof = plan.clients.profiles;
    if (prof?.email) {
      const origin = await requestOrigin();
      await sendTemplateEmail({
        to: prof.email,
        templateKey: "menu_published",
        vars: { nombre: prof.full_name.split(" ")[0] ?? "", enlace: `${origin}/comida` },
        cta: { label: "Ver mi menú", href: `${origin}/comida` },
      });
    }
  }
  refresh(plan.client_id);
  return { ok: true };
}

export async function deleteMealPlan(planId: string): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("meal_plans").select("client_id, template_id").eq("id", planId).single();
  if (data?.template_id) await supabase.from("meal_templates").delete().eq("id", data.template_id);
  else await supabase.from("meal_plans").delete().eq("id", planId);
  refresh(data?.client_id);
  return { ok: true };
}

export async function addMeal(input: {
  dayId: string;
  slot: "breakfast" | "lunch" | "snack" | "dinner" | "extra";
  title?: string;
}): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: day } = await supabase.from("meal_plan_days").select("client_id").eq("id", input.dayId).single();
  if (!day) return fail("Día no encontrado.");
  const { count } = await supabase
    .from("meals")
    .select("id", { count: "exact", head: true })
    .eq("day_id", input.dayId)
    .eq("slot", input.slot);
  const { data, error } = await supabase
    .from("meals")
    .insert({
      day_id: input.dayId,
      client_id: day.client_id,
      slot: input.slot,
      title: input.title?.trim() || null,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) return fail("No se ha podido añadir la comida.");
  refresh(day.client_id);
  return { ok: true, id: data.id };
}

export async function updateMeal(mealId: string, patch: { title?: string; notes?: string }): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meals")
    .update({
      ...(patch.title !== undefined ? { title: patch.title.trim() || null } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes.trim() || null } : {}),
    })
    .eq("id", mealId)
    .select("client_id")
    .single();
  if (error) return fail("No se ha podido guardar.");
  refresh(data.client_id);
  return { ok: true };
}

export async function deleteMeal(mealId: string): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("meals").select("client_id").eq("id", mealId).single();
  await supabase.from("meals").delete().eq("id", mealId);
  refresh(data?.client_id);
  return { ok: true };
}

/** Copia todas las comidas de un día a otro(s) días del mismo menú. */
export async function copyDay(fromDayId: string, toDayIds: string[]): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: meals } = await supabase
    .from("meals")
    .select(
      "slot, title, sort_order, notes, client_id, meal_items(food_id, quantity_g, quantity_units, notes, sort_order)",
    )
    .eq("day_id", fromDayId);
  for (const to of toDayIds) {
    for (const m of meals ?? []) {
      const { data: nm } = await supabase
        .from("meals")
        .insert({
          day_id: to,
          client_id: m.client_id,
          slot: m.slot,
          title: m.title,
          sort_order: m.sort_order,
          notes: m.notes,
        })
        .select("id")
        .single();
      if (nm && m.meal_items.length) {
        await supabase
          .from("meal_items")
          .insert(m.meal_items.map((i) => ({ ...i, meal_id: nm.id, client_id: m.client_id })));
      }
    }
  }
  refresh(meals?.[0]?.client_id);
  return { ok: true };
}

const itemSchema = z.object({
  id: z.uuid().optional(),
  mealId: z.uuid(),
  foodId: z.uuid(),
  quantityG: z.number().positive().max(5000).nullable(),
  quantityUnits: z.number().positive().max(100).nullable(),
  notes: z.string().trim().max(300).nullable().default(null),
});

export async function saveMealItem(input: z.input<typeof itemSchema>): Promise<NutritionResult> {
  await requireScope("clients");
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return fail("Indica la cantidad (gramos o unidades).");
  const d = parsed.data;
  if (d.quantityG == null && d.quantityUnits == null) return fail("Indica la cantidad (gramos o unidades).");
  const supabase = await createClient();
  const { data: meal } = await supabase.from("meals").select("client_id").eq("id", d.mealId).single();
  if (!meal) return fail("Comida no encontrada.");
  const row = {
    meal_id: d.mealId,
    client_id: meal.client_id,
    food_id: d.foodId,
    quantity_g: d.quantityG,
    quantity_units: d.quantityUnits,
    notes: d.notes,
  };
  const { error } = d.id
    ? await supabase.from("meal_items").update(row).eq("id", d.id)
    : await supabase.from("meal_items").insert(row);
  if (error) return fail("No se ha podido guardar.");
  refresh(meal.client_id);
  return { ok: true };
}

export async function deleteMealItem(itemId: string): Promise<NutritionResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("meal_items").select("client_id").eq("id", itemId).single();
  await supabase.from("meal_items").delete().eq("id", itemId);
  refresh(data?.client_id);
  return { ok: true };
}

export async function resolveChangeRequest(input: {
  requestId: string;
  status: "resolved" | "rejected";
  response: string;
}): Promise<NutritionResult> {
  const viewer = await requireScope("clients");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meal_change_requests")
    .update({
      status: input.status,
      response: input.response.trim() || null,
      resolved_by: viewer.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .select("client_id, clients(profile_id)")
    .single();
  if (error || !data) return fail("No se ha podido guardar.");
  if (data.clients?.profile_id) {
    await createAdminClient().rpc("notify", {
      p_profile_id: data.clients.profile_id,
      p_type: "meal_change_answered",
      p_title: input.status === "resolved" ? "Jaime ha cambiado tu menú" : "Jaime ha respondido a tu cambio de menú",
      p_body: input.response.slice(0, 160) || undefined,
      p_link: "/comida",
      p_client_id: data.client_id,
    });
  }
  refresh(data.client_id);
  revalidatePath("/panel/pendientes");
  return { ok: true };
}

export async function saveAffiliateLink(input: {
  id?: string;
  label: string;
  description: string;
  url: string;
  code: string;
  isActive: boolean;
}): Promise<NutritionResult> {
  await requireScope("settings");
  if (!/^https:\/\//.test(input.url)) return fail("El enlace tiene que empezar por https://");
  const supabase = await createClient();
  const row = {
    label: input.label.trim().slice(0, 80),
    description: input.description.trim().slice(0, 400) || null,
    url: input.url.trim(),
    code: input.code.trim() || null,
    is_active: input.isActive,
  };
  const { error } = input.id
    ? await supabase.from("affiliate_links").update(row).eq("id", input.id)
    : await supabase.from("affiliate_links").insert(row);
  if (error) return fail("No se ha podido guardar.");
  revalidatePath("/panel/biblioteca/suplementos");
  revalidatePath("/comida/suplementos");
  return { ok: true };
}
