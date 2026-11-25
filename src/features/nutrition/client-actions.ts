"use server";

import { revalidatePath } from "next/cache";
import { getClientContext, getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildShoppingList } from "@/domain/nutrition/shopping";
import { portionGrams } from "@/domain/nutrition/macros";
import { getPlanTree } from "./queries";

export type ClientNutritionResult = { ok: true } | { ok: false; error: string };

export async function requestMealChange(input: {
  planId: string;
  mealId: string | null;
  dayIndex: number;
  reason: string;
}): Promise<ClientNutritionResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { ok: false, error: "Sin acceso." };
  const reason = input.reason.trim();
  if (reason.length < 3) return { ok: false, error: "Cuéntale a Jaime qué quieres cambiar." };
  const supabase = await createClient();
  const { error } = await supabase.from("meal_change_requests").insert({
    client_id: ctx.client.id,
    meal_plan_id: input.planId,
    meal_id: input.mealId,
    day_index: input.dayIndex,
    reason: reason.slice(0, 1000),
  });
  if (error) return { ok: false, error: "No se ha podido enviar." };
  await createAdminClient().rpc("notify_staff", {
    p_type: "meal_change_requested",
    p_title: `${ctx.viewer.fullName} pide un cambio en el menú`,
    p_body: reason.slice(0, 200),
    p_link: `/panel/clientes/${ctx.client.id}/nutricion`,
    p_client_id: ctx.client.id,
  });
  revalidatePath("/comida", "layout");
  return { ok: true };
}

/** Nota del día (la escriben el cliente o el equipo). */
export async function addDayNote(input: {
  clientId?: string;
  date: string;
  body: string;
}): Promise<ClientNutritionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sin sesión." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "La nota está vacía." };
  let clientId = input.clientId;
  if (viewer.role === "client") {
    const ctx = await getClientContext();
    if (!ctx) return { ok: false, error: "Sin acceso." };
    clientId = ctx.client.id;
  }
  if (!clientId) return { ok: false, error: "Falta el cliente." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("day_notes")
    .insert({ client_id: clientId, date: input.date, author_id: viewer.id, body: body.slice(0, 2000) });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  if (viewer.role === "client") {
    await createAdminClient().rpc("notify_staff", {
      p_type: "day_note",
      p_title: `Nota de ${viewer.fullName} en su menú`,
      p_body: body.slice(0, 200),
      p_link: `/panel/clientes/${clientId}/nutricion`,
      p_client_id: clientId,
    });
  }
  revalidatePath("/comida", "layout");
  revalidatePath(`/panel/clientes/${clientId}/nutricion`);
  return { ok: true };
}

export async function deleteDayNote(noteId: string): Promise<ClientNutritionResult> {
  const supabase = await createClient();
  await supabase.from("day_notes").delete().eq("id", noteId);
  revalidatePath("/comida", "layout");
  return { ok: true };
}

/** Genera (o regenera) la lista de la compra del menú para N personas. Conserva lo marcado. */
export async function generateShoppingList(planId: string, persons: number): Promise<ClientNutritionResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { ok: false, error: "Sin acceso." };
  const plan = await getPlanTree(planId);
  if (!plan || plan.client_id !== ctx.client.id) return { ok: false, error: "Menú no encontrado." };
  const p = Math.min(Math.max(Math.round(persons) || 1, 1), 10);

  const inputs = plan.meal_plan_days.flatMap((d) =>
    d.meals.flatMap((m) =>
      m.meal_items.map((i) => {
        const g = portionGrams(i.foods, i);
        return {
          foodId: i.food_id,
          name: i.foods.name,
          section: i.foods.supermarket_section,
          grams: g,
          units: g == null ? i.quantity_units : null,
          packSizeG: i.foods.pack_size_g,
          priceCents: i.foods.price_cents,
        };
      }),
    ),
  );
  const lines = buildShoppingList(inputs, p);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shopping_lists")
    .select("id, shopping_list_items(food_id, checked)")
    .eq("meal_plan_id", planId)
    .maybeSingle();
  const checked = new Set((existing?.shopping_list_items ?? []).filter((i) => i.checked).map((i) => i.food_id));
  let listId = existing?.id;
  if (listId) {
    await supabase
      .from("shopping_lists")
      .update({ persons: p, generated_at: new Date().toISOString() })
      .eq("id", listId);
    await supabase.from("shopping_list_items").delete().eq("list_id", listId);
  } else {
    const { data, error } = await supabase
      .from("shopping_lists")
      .insert({ client_id: ctx.client.id, meal_plan_id: planId, persons: p })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: "No se ha podido crear la lista." };
    listId = data.id;
  }
  if (lines.length) {
    await supabase.from("shopping_list_items").insert(
      lines.map((l) => ({
        list_id: listId!,
        client_id: ctx.client.id,
        food_id: l.foodId,
        name: l.name,
        section: l.section,
        quantity_g: l.grams,
        units: l.units,
        packs: l.packs,
        estimated_cents: l.estimatedCents,
        checked: checked.has(l.foodId),
      })),
    );
  }
  revalidatePath("/comida/compra");
  return { ok: true };
}

export async function toggleShoppingItem(itemId: string, checked: boolean): Promise<ClientNutritionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").update({ checked }).eq("id", itemId);
  return error ? { ok: false, error: "No se ha podido guardar." } : { ok: true };
}
