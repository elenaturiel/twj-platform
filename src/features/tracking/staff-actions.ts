"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestOrigin } from "@/lib/request";
import { todayInMadrid } from "@/lib/dates";
import { sendTemplateEmail } from "@/lib/email/send";

export type StaffTrackingResult = { ok: true; id?: string } | { ok: false; error: string };

const metricSchema = z.object({
  clientId: z.uuid(),
  metricId: z.uuid(),
  active: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  targetValue: z.number().nullable(),
  targetDirection: z.enum(["up", "down", "keep"]).nullable(),
});

/** Activa/desactiva una métrica para un cliente (todas ocultas por defecto). */
export async function setClientMetric(input: z.input<typeof metricSchema>): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const parsed = metricSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("client_metrics").upsert(
    {
      client_id: d.clientId,
      metric_id: d.metricId,
      is_active: d.active,
      frequency: d.frequency,
      target_value: d.targetValue,
      target_direction: d.targetDirection,
    },
    { onConflict: "client_id,metric_id" },
  );
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath(`/panel/clientes/${d.clientId}/progreso`);
  return { ok: true };
}

export async function setCheckinSchedule(
  clientId: string,
  frequencyDays: number | null,
  weekday: number | null,
): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      checkin_frequency_days: frequencyDays ? Math.min(Math.max(Math.round(frequencyDays), 1), 60) : null,
      checkin_weekday: weekday === null ? null : Math.min(Math.max(weekday, 0), 6),
    })
    .eq("id", clientId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath(`/panel/clientes/${clientId}/checkins`);
  return { ok: true };
}

/** Crea un check-in para hoy (sin esperar al calendario). */
export async function createCheckinNow(clientId: string): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: tpl } = await supabase.from("checkin_templates").select("id").eq("is_default", true).maybeSingle();
  const { error } = await supabase
    .from("checkins")
    .insert({ client_id: clientId, template_id: tpl?.id ?? null, due_on: todayInMadrid() });
  if (error)
    return {
      ok: false,
      error: error.code === "23505" ? "Ya tiene un check-in con fecha de hoy." : "No se ha podido crear.",
    };
  const admin = createAdminClient();
  const { data: c } = await admin.from("clients").select("profile_id").eq("id", clientId).single();
  if (c) {
    await admin.rpc("notify", {
      p_profile_id: c.profile_id,
      p_type: "checkin_due",
      p_title: "Toca check-in",
      p_body: "Jaime te ha pedido un check-in. 3 minutos y listo.",
      p_link: "/progreso/checkin",
      p_client_id: clientId,
    });
  }
  revalidatePath(`/panel/clientes/${clientId}/checkins`);
  return { ok: true };
}

const reviewSchema = z.object({
  checkinId: z.uuid(),
  reply: z.string().trim().max(5000),
  voicePath: z.string().max(300).nullable(),
});

/** Jaime responde (texto y/o nota de voz) y marca el check-in como revisado. */
export async function reviewCheckin(input: z.input<typeof reviewSchema>): Promise<StaffTrackingResult> {
  const viewer = await requireScope("clients");
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Respuesta no válida." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: c, error } = await supabase
    .from("checkins")
    .update({
      status: "reviewed",
      reviewed_by: viewer.id,
      reviewed_at: new Date().toISOString(),
      staff_reply: d.reply || null,
      ...(d.voicePath ? { staff_voice_path: d.voicePath } : {}),
    })
    .eq("id", d.checkinId)
    .select("client_id, clients(profile_id, profiles(email, full_name))")
    .single();
  if (error || !c) return { ok: false, error: "No se ha podido guardar." };

  const admin = createAdminClient();
  const profile = c.clients?.profiles;
  if (c.clients?.profile_id) {
    await admin.rpc("notify", {
      p_profile_id: c.clients.profile_id,
      p_type: "checkin_reviewed",
      p_title: "Jaime ha revisado tu check-in",
      p_body: d.reply ? d.reply.slice(0, 160) : "Tienes una nota de voz de Jaime.",
      p_link: "/progreso/checkins",
      p_client_id: c.client_id,
    });
  }
  if (profile?.email) {
    const origin = await requestOrigin();
    await sendTemplateEmail({
      to: profile.email,
      templateKey: "checkin_reviewed",
      vars: { nombre: profile.full_name.split(" ")[0] ?? "", enlace: `${origin}/progreso/checkins` },
      cta: { label: "Ver respuesta", href: `${origin}/progreso/checkins` },
    });
  }
  revalidatePath(`/panel/clientes/${c.client_id}/checkins`);
  revalidatePath("/panel/pendientes");
  return { ok: true };
}

/** Enlaces firmados a fotos de un cliente para staff (queda en la auditoría). */
export async function staffPhotoUrls(clientId: string) {
  await requireScope("health");
  const supabase = await createClient();
  await supabase.rpc("log_access", { p_entity: "progress_photos", p_entity_id: clientId, p_client_id: clientId });
  const { data } = await supabase
    .from("progress_photos")
    .select("id, storage_path, pose, taken_on")
    .eq("client_id", clientId)
    .order("taken_on", { ascending: false });
  if (!data?.length) return [];
  const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrls(
    data.map((p) => p.storage_path),
    300,
  );
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return data.map((p) => ({ id: p.id, pose: p.pose, taken_on: p.taken_on, url: urls.get(p.storage_path) ?? null }));
}

// ───────────── Catálogo de métricas, plantilla de check-in y campos personalizados ─────────────

const defSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(60),
  type: z.enum(["number", "scale", "text", "photo"]),
  unit: z.string().trim().max(20).nullable(),
  suggested_frequency: z.enum(["daily", "weekly", "monthly"]),
  is_active: z.boolean(),
});

export async function saveMetricDefinition(input: z.input<typeof defSchema>): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const parsed = defSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa la métrica." };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const key = row.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  const { error } = id
    ? await supabase.from("metric_definitions").update(row).eq("id", id)
    : await supabase
        .from("metric_definitions")
        .insert({ ...row, key: `${key || "metrica"}_${Date.now().toString(36)}` });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/seguimiento");
  return { ok: true };
}

const questionSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().trim().min(1).max(200),
  type: z.enum(["text", "scale", "number", "yesno"]),
  required: z.boolean(),
});

export async function saveCheckinTemplate(input: {
  id: string;
  name: string;
  questions: z.input<typeof questionSchema>[];
  includeMetrics: boolean;
  includePhotos: boolean;
}): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const questions = z.array(questionSchema).max(30).safeParse(input.questions);
  if (!questions.success) return { ok: false, error: "Revisa las preguntas." };
  const keys = new Set(questions.data.map((q) => q.key));
  if (keys.size !== questions.data.length) return { ok: false, error: "Hay preguntas repetidas." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("checkin_templates")
    .update({
      name: input.name.trim().slice(0, 80) || "Check-in",
      questions: questions.data,
      include_metrics: input.includeMetrics,
      include_photos: input.includePhotos,
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/seguimiento");
  return { ok: true };
}

const fieldSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().min(1).max(60),
  type: z.enum(["text", "number", "select", "date"]),
  options: z.array(z.string().trim().min(1).max(60)).max(30),
  client_editable: z.boolean(),
  is_active: z.boolean(),
});

export async function saveCustomField(input: z.input<typeof fieldSchema>): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const parsed = fieldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el campo." };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const key = row.label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  const { error } = id
    ? await supabase.from("custom_fields").update(row).eq("id", id)
    : await supabase.from("custom_fields").insert({ ...row, key: `${key || "campo"}_${Date.now().toString(36)}` });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/seguimiento");
  return { ok: true };
}

/** Asigna (o quita) un campo personalizado a un cliente y/o le pone valor. */
export async function setClientCustomField(input: {
  clientId: string;
  fieldId: string;
  assigned: boolean;
  value?: string | null;
}): Promise<StaffTrackingResult> {
  await requireScope("clients");
  const supabase = await createClient();
  if (!input.assigned) {
    await supabase.from("custom_field_values").delete().eq("client_id", input.clientId).eq("field_id", input.fieldId);
  } else {
    const { error } = await supabase.from("custom_field_values").upsert(
      {
        client_id: input.clientId,
        field_id: input.fieldId,
        value: input.value?.trim() ? input.value.trim().slice(0, 500) : null,
      },
      { onConflict: "client_id,field_id" },
    );
    if (error) return { ok: false, error: "No se ha podido guardar." };
  }
  revalidatePath(`/panel/clientes/${input.clientId}/ficha`);
  return { ok: true };
}
