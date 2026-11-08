"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { FORMATS_BY_MODALITY, type Format } from "@/domain/training/prescription";
import type { ParsedBlock } from "@/domain/training/import";
import { exerciseSchema, itemSchema, partSchema } from "./schemas";

export type TrainingResult = { ok: true; id?: string } | { ok: false; error: string };

const fail = (error: string): TrainingResult => ({ ok: false, error });

function refresh(clientId: string | null, blockId?: string) {
  if (clientId) {
    revalidatePath(`/panel/clientes/${clientId}/entreno`, "layout");
  }
  if (blockId) revalidatePath(`/panel/biblioteca/plantillas/${blockId}`);
  revalidatePath("/entreno", "layout");
  revalidatePath("/hoy");
}

/** client_id del bloque (o null en plantillas), para copiarlo a cada nivel. */
async function blockOwner(blockId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_blocks")
    .select("id, client_id, template_id")
    .eq("id", blockId)
    .single();
  return data;
}

// ───────────────────────────── Ejercicios ─────────────────────────────

export async function saveExercise(input: z.input<typeof exerciseSchema>): Promise<TrainingResult> {
  const viewer = await requireScope("clients");
  const parsed = exerciseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revisa el ejercicio.");
  const { id, video_url, ...rest } = parsed.data;
  const provider = !video_url
    ? null
    : /youtube\.com|youtu\.be/.test(video_url)
      ? "youtube"
      : /drive\.google\.com/.test(video_url)
        ? "drive"
        : "other";
  const row = {
    ...rest,
    video_url: video_url || null,
    video_provider: provider,
    instructions: rest.instructions || null,
    common_mistakes: rest.common_mistakes || null,
  };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("exercises").update(row).eq("id", id).select("id").single()
    : await supabase
        .from("exercises")
        .insert({ ...row, created_by: viewer.id })
        .select("id")
        .single();
  if (error)
    return fail(error.code === "23505" ? "Ya existe un ejercicio con ese nombre." : "No se ha podido guardar.");
  revalidatePath("/panel/biblioteca");
  return { ok: true, id: data.id };
}

/** Importación de ejercicios desde CSV/Excel ya parseado (nombre, modalidad, grupos, material, vídeo…). */
export async function importExercises(
  rows: z.input<typeof exerciseSchema>[],
): Promise<TrainingResult & { created?: number; skipped?: number }> {
  const viewer = await requireScope("clients");
  const valid = rows
    .map((r) => exerciseSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => r.data!);
  const supabase = await createClient();
  const { data: existing } = await supabase.from("exercises").select("name");
  const names = new Set((existing ?? []).map((e) => e.name.toLowerCase()));
  const fresh = valid.filter((r) => !names.has(r.name.toLowerCase()));
  if (fresh.length) {
    const { error } = await supabase.from("exercises").insert(
      fresh.map(({ video_url, ...r }) => ({
        ...r,
        video_url: video_url || null,
        video_provider: !video_url
          ? null
          : /youtu/.test(video_url)
            ? "youtube"
            : /drive\.google/.test(video_url)
              ? "drive"
              : "other",
        instructions: r.instructions || null,
        common_mistakes: r.common_mistakes || null,
        created_by: viewer.id,
      })),
    );
    if (error) return fail("No se han podido importar los ejercicios.");
  }
  revalidatePath("/panel/biblioteca");
  return { ok: true, created: fresh.length, skipped: rows.length - fresh.length };
}

// ───────────────────────────── Bloques ─────────────────────────────

const blockSchema = z.object({
  clientId: z.uuid().nullable(),
  templateId: z.uuid().nullable(),
  name: z.string().trim().min(1).max(80),
  goal: z.string().trim().max(300).default(""),
  startsOn: z.iso.date().nullable(),
  weeks: z.coerce.number().int().min(1).max(16),
});

export async function createBlock(input: z.input<typeof blockSchema>): Promise<TrainingResult> {
  await requireScope("clients");
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return fail("Revisa los datos del bloque.");
  const d = parsed.data;
  const supabase = await createClient();
  const { data: block, error } = await supabase
    .from("workout_blocks")
    .insert({
      client_id: d.clientId,
      template_id: d.templateId,
      name: d.name,
      goal: d.goal || null,
      starts_on: d.startsOn,
    })
    .select("id")
    .single();
  if (error || !block) return fail("No se ha podido crear el bloque.");
  await supabase
    .from("workout_weeks")
    .insert(Array.from({ length: d.weeks }, (_, i) => ({ block_id: block.id, client_id: d.clientId, week_index: i })));
  refresh(d.clientId, d.templateId ?? undefined);
  return { ok: true, id: block.id };
}

export async function updateBlock(input: {
  blockId: string;
  name?: string;
  goal?: string;
  startsOn?: string | null;
  status?: "draft" | "active" | "done";
  notes?: string;
}): Promise<TrainingResult> {
  await requireScope("clients");
  const owner = await blockOwner(input.blockId);
  if (!owner) return fail("Bloque no encontrado.");
  const supabase = await createClient();
  const patch: {
    name?: string;
    goal?: string | null;
    starts_on?: string | null;
    status?: "draft" | "active" | "done";
    notes?: string | null;
  } = {};
  if (input.name !== undefined) patch.name = input.name.trim().slice(0, 80) || "Bloque";
  if (input.goal !== undefined) patch.goal = input.goal.trim() || null;
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn || null;
  if (input.status) patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes.trim() || null;
  const { error } = await supabase.from("workout_blocks").update(patch).eq("id", input.blockId);
  if (error) return fail("No se ha podido guardar.");

  // Publicar un bloque nuevo avisa al cliente
  if (input.status === "active" && owner.client_id) {
    const { data: c } = await supabase.from("clients").select("profile_id").eq("id", owner.client_id).single();
    if (c) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      await createAdminClient().rpc("notify", {
        p_profile_id: c.profile_id,
        p_type: "plan_updated",
        p_title: "Tienes plan nuevo",
        p_body: `Jaime ha publicado «${patch.name ?? "tu nuevo bloque"}». A darle.`,
        p_link: "/entreno",
        p_client_id: owner.client_id,
      });
    }
  }
  refresh(owner.client_id, owner.template_id ?? undefined);
  return { ok: true };
}

export async function deleteBlock(blockId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const owner = await blockOwner(blockId);
  const supabase = await createClient();
  const { error } = await supabase.from("workout_blocks").delete().eq("id", blockId);
  if (error) return fail("No se ha podido borrar.");
  refresh(owner?.client_id ?? null);
  return { ok: true };
}

/** Duplica un bloque para el mismo cliente, lo asigna a otro o lo guarda como plantilla. */
export async function copyBlockTo(input: {
  blockId: string;
  toClientId?: string | null;
  asTemplate?: { name: string; description?: string } | null;
  startsOn?: string | null;
}): Promise<TrainingResult> {
  const viewer = await requireScope("clients");
  const supabase = await createClient();
  let templateId: string | null = null;
  if (input.asTemplate) {
    const { data: t, error } = await supabase
      .from("workout_templates")
      .insert({
        name: input.asTemplate.name.trim().slice(0, 80),
        description: input.asTemplate.description ?? null,
        created_by: viewer.id,
      })
      .select("id")
      .single();
    if (error || !t) return fail("No se ha podido crear la plantilla.");
    templateId = t.id;
  }
  const { data, error } = await supabase.rpc("copy_block", {
    p_block: input.blockId,
    p_client: (templateId ? null : (input.toClientId ?? null)) as string,
    p_template: templateId as string,
    p_starts_on: (input.startsOn ?? null) as string,
    p_name: (input.asTemplate?.name ?? null) as string,
  });
  if (error || !data) return fail("No se ha podido copiar el bloque.");
  refresh(input.toClientId ?? null);
  revalidatePath("/panel/biblioteca/plantillas");
  return { ok: true, id: data };
}

export async function deleteTemplate(templateId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { error } = await supabase.from("workout_templates").delete().eq("id", templateId);
  if (error) return fail("No se ha podido borrar.");
  revalidatePath("/panel/biblioteca/plantillas");
  return { ok: true };
}

// ───────────────────────────── Semanas y sesiones ─────────────────────────────

export async function addWeek(blockId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const owner = await blockOwner(blockId);
  if (!owner) return fail("Bloque no encontrado.");
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("workout_weeks")
    .select("week_index")
    .eq("block_id", blockId)
    .order("week_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase
    .from("workout_weeks")
    .insert({ block_id: blockId, client_id: owner.client_id, week_index: (last?.week_index ?? -1) + 1 });
  if (error) return fail("No se ha podido añadir la semana.");
  refresh(owner.client_id, owner.template_id ?? undefined);
  return { ok: true };
}

export async function copyWeek(weekId: string, asDeload: boolean): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_week", { p_week: weekId, p_as_deload: asDeload });
  if (error) return fail("No se ha podido duplicar la semana.");
  const { data: w } = await supabase.from("workout_weeks").select("client_id, block_id").eq("id", data).single();
  refresh(w?.client_id ?? null, w?.block_id);
  return { ok: true };
}

export async function updateWeek(
  weekId: string,
  patch: { is_deload?: boolean; notes?: string },
): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_weeks")
    .update(patch)
    .eq("id", weekId)
    .select("client_id")
    .single();
  if (error) return fail("No se ha podido guardar.");
  refresh(data.client_id);
  return { ok: true };
}

export async function deleteWeek(weekId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("workout_weeks").select("client_id").eq("id", weekId).single();
  const { error } = await supabase.from("workout_weeks").delete().eq("id", weekId);
  if (error) return fail("No se ha podido borrar.");
  refresh(data?.client_id ?? null);
  return { ok: true };
}

export async function saveSession(input: {
  id?: string;
  weekId: string;
  title: string;
  dayIndex: number | null;
  notes?: string;
  published?: boolean;
}): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: week } = await supabase.from("workout_weeks").select("client_id").eq("id", input.weekId).single();
  if (!week) return fail("Semana no encontrada.");
  const row = {
    week_id: input.weekId,
    client_id: week.client_id,
    title: input.title.trim().slice(0, 80) || "Sesión",
    day_index: input.dayIndex,
    notes: input.notes?.trim() || null,
    published: input.published ?? true,
  };
  const { data, error } = input.id
    ? await supabase.from("workout_sessions").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("workout_sessions").insert(row).select("id").single();
  if (error) return fail("No se ha podido guardar la sesión.");
  refresh(week.client_id);
  return { ok: true, id: data.id };
}

export async function deleteSession(sessionId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("workout_sessions").select("client_id").eq("id", sessionId).single();
  const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
  if (error) return fail("No se ha podido borrar.");
  refresh(data?.client_id ?? null);
  return { ok: true };
}

// ───────────────────────────── Partes e ítems ─────────────────────────────

export async function savePart(input: z.input<typeof partSchema>): Promise<TrainingResult> {
  await requireScope("clients");
  const parsed = partSchema.safeParse(input);
  if (!parsed.success) return fail("Revisa el bloque de la sesión.");
  const d = parsed.data;
  if (!FORMATS_BY_MODALITY[d.modality].includes(d.format as Format))
    return fail("Ese formato no encaja con la modalidad.");
  const supabase = await createClient();
  const { data: session } = await supabase.from("workout_sessions").select("client_id").eq("id", d.session_id).single();
  if (!session) return fail("Sesión no encontrada.");
  let sortOrder: number | undefined;
  if (!d.id) {
    const { count } = await supabase
      .from("session_parts")
      .select("id", { count: "exact", head: true })
      .eq("session_id", d.session_id);
    sortOrder = count ?? 0;
  }
  const row = {
    session_id: d.session_id,
    client_id: session.client_id,
    title: d.title || null,
    modality: d.modality,
    format: d.format,
    params: d.params,
    notes: d.notes || null,
    ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
  };
  const { data, error } = d.id
    ? await supabase.from("session_parts").update(row).eq("id", d.id).select("id").single()
    : await supabase.from("session_parts").insert(row).select("id").single();
  if (error) return fail("No se ha podido guardar.");
  refresh(session.client_id);
  return { ok: true, id: data.id };
}

export async function deletePart(partId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("session_parts").select("client_id").eq("id", partId).single();
  const { error } = await supabase.from("session_parts").delete().eq("id", partId);
  if (error) return fail("No se ha podido borrar.");
  refresh(data?.client_id ?? null);
  return { ok: true };
}

export async function saveItem(input: z.input<typeof itemSchema>): Promise<TrainingResult> {
  await requireScope("clients");
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Revisa el ejercicio.");
  const d = parsed.data;
  if (!d.exercise_id && !d.name) return fail("Elige un ejercicio o escribe una tarea.");
  const supabase = await createClient();
  const { data: part } = await supabase.from("session_parts").select("client_id").eq("id", d.part_id).single();
  if (!part) return fail("Bloque no encontrado.");
  let sortOrder: number | undefined;
  if (!d.id) {
    const { count } = await supabase
      .from("session_items")
      .select("id", { count: "exact", head: true })
      .eq("part_id", d.part_id);
    sortOrder = count ?? 0;
  }
  const row = {
    part_id: d.part_id,
    client_id: part.client_id,
    exercise_id: d.exercise_id,
    name: d.name || null,
    superset_group: d.superset_group || null,
    prescription: d.prescription,
    notes: d.notes || null,
    ...(sortOrder !== undefined ? { sort_order: sortOrder } : {}),
  };
  const { data, error } = d.id
    ? await supabase.from("session_items").update(row).eq("id", d.id).select("id").single()
    : await supabase.from("session_items").insert(row).select("id").single();
  if (error) return fail("No se ha podido guardar.");
  refresh(part.client_id);
  return { ok: true, id: data.id };
}

export async function deleteItem(itemId: string): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data } = await supabase.from("session_items").select("client_id").eq("id", itemId).single();
  const { error } = await supabase.from("session_items").delete().eq("id", itemId);
  if (error) return fail("No se ha podido borrar.");
  refresh(data?.client_id ?? null);
  return { ok: true };
}

export async function moveItem(itemId: string, direction: -1 | 1): Promise<TrainingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("session_items")
    .select("id, part_id, sort_order, client_id")
    .eq("id", itemId)
    .single();
  if (!item) return fail("No encontrado.");
  const { data: siblings } = await supabase
    .from("session_items")
    .select("id, sort_order")
    .eq("part_id", item.part_id)
    .order("sort_order");
  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === itemId);
  const swap = list[idx + direction];
  if (!swap) return { ok: true };
  // Reasigna órdenes consecutivos para que el intercambio sea estable
  const reordered = [...list];
  [reordered[idx], reordered[idx + direction]] = [reordered[idx + direction]!, reordered[idx]!];
  await Promise.all(reordered.map((s, i) => supabase.from("session_items").update({ sort_order: i }).eq("id", s.id)));
  refresh(item.client_id);
  return { ok: true };
}

// ───────────────────────────── Importación desde Excel ─────────────────────────────

/**
 * Crea los bloques ya validados por el asistente (src/domain/training/import.ts).
 * Los ejercicios que no existen en la biblioteca se crean como tarea con nombre.
 */
export async function importParsedBlocks(input: {
  blocks: ParsedBlock[];
  clientId: string | null;
  startsOn: string | null;
  fileName: string;
  rowCount: number;
}): Promise<TrainingResult & { created?: number }> {
  const viewer = await requireScope("clients");
  if (!input.blocks.length) return fail("No hay nada que importar.");
  const supabase = await createClient();
  const { data: library } = await supabase.from("exercises").select("id, name");
  const byName = new Map((library ?? []).map((e) => [e.name.toLowerCase(), e.id]));

  let created = 0;
  for (const b of input.blocks) {
    let templateId: string | null = null;
    if (!input.clientId) {
      const { data: t } = await supabase
        .from("workout_templates")
        .insert({ name: b.name, created_by: viewer.id })
        .select("id")
        .single();
      templateId = t?.id ?? null;
      if (!templateId) return fail("No se ha podido crear la plantilla.");
    }
    const { data: block, error } = await supabase
      .from("workout_blocks")
      .insert({
        client_id: input.clientId,
        template_id: templateId,
        name: b.name,
        starts_on: input.clientId ? input.startsOn : null,
      })
      .select("id")
      .single();
    if (error || !block) return fail(`No se ha podido crear el bloque «${b.name}».`);
    created++;
    for (const w of b.weeks) {
      const { data: week } = await supabase
        .from("workout_weeks")
        .insert({ block_id: block.id, client_id: input.clientId, week_index: w.weekIndex })
        .select("id")
        .single();
      if (!week) continue;
      for (const [si, s] of w.sessions.entries()) {
        const { data: session } = await supabase
          .from("workout_sessions")
          .insert({
            week_id: week.id,
            client_id: input.clientId,
            title: s.title,
            day_index: s.dayIndex,
            sort_order: si,
          })
          .select("id")
          .single();
        if (!session) continue;
        for (const [pi, p] of s.parts.entries()) {
          const { data: part } = await supabase
            .from("session_parts")
            .insert({
              session_id: session.id,
              client_id: input.clientId,
              modality: p.modality,
              format: p.format,
              sort_order: pi,
            })
            .select("id")
            .single();
          if (!part) continue;
          await supabase.from("session_items").insert(
            p.items.map((it, ii) => {
              const exerciseId = byName.get(it.exercise.toLowerCase()) ?? null;
              return {
                part_id: part.id,
                client_id: input.clientId,
                exercise_id: exerciseId,
                name: exerciseId ? null : it.exercise,
                sort_order: ii,
                prescription: it.prescription,
                notes: it.notes,
              };
            }),
          );
        }
      }
    }
  }

  await supabase.from("import_jobs").insert({
    kind: "workouts",
    file_name: input.fileName.slice(0, 200),
    target: { client_id: input.clientId },
    status: "done",
    summary: { blocks: created, rows: input.rowCount },
    created_by: viewer.id,
  });
  refresh(input.clientId);
  revalidatePath("/panel/biblioteca/plantillas");
  return { ok: true, created };
}
