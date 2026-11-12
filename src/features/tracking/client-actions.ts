"use server";

import { revalidatePath } from "next/cache";
import { evaluateQuietly } from "@/features/engagement/engine.server";
import { z } from "zod";
import { getClientContext } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInMadrid } from "@/lib/dates";

export type TrackingResult = { ok: true } | { ok: false; error: string };

async function ctxOrFail() {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return null;
  return ctx;
}

const entrySchema = z.object({
  metricId: z.uuid(),
  value: z.string().trim().min(1).max(1000),
  recordedOn: z.iso.date(),
});

/** Registro de una métrica (si ya había uno ese día, lo sustituye). */
export async function addMetricEntry(input: z.input<typeof entrySchema>): Promise<TrackingResult> {
  const ctx = await ctxOrFail();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Valor no válido." };
  const d = parsed.data;
  if (d.recordedOn > todayInMadrid()) return { ok: false, error: "No puedes registrar el futuro (todavía)." };
  const supabase = await createClient();
  const { data: def } = await supabase.from("metric_definitions").select("type").eq("id", d.metricId).single();
  if (!def) return { ok: false, error: "Métrica no encontrada." };
  const n = Number(d.value.replace(",", "."));
  const isNum = def.type === "number" || def.type === "scale";
  if (isNum && (!Number.isFinite(n) || n < 0 || (def.type === "scale" && (n < 1 || n > 10)))) {
    return { ok: false, error: def.type === "scale" ? "Del 1 al 10." : "Tiene que ser un número." };
  }
  const { error } = await supabase.from("metric_entries").upsert(
    {
      client_id: ctx.client.id,
      metric_id: d.metricId,
      recorded_on: d.recordedOn,
      value_num: isNum ? n : null,
      value_text: isNum ? null : d.value,
      source: "manual",
    },
    { onConflict: "client_id,metric_id,recorded_on" },
  );
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/progreso");
  return { ok: true };
}

export async function deleteMetricEntry(entryId: string): Promise<TrackingResult> {
  const ctx = await ctxOrFail();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  const supabase = await createClient();
  await supabase.from("metric_entries").delete().eq("id", entryId).eq("client_id", ctx.client.id);
  revalidatePath("/progreso");
  return { ok: true };
}

/** Registra una foto ya subida a su carpeta privada. Requiere el consentimiento de fotos. */
export async function addProgressPhoto(input: {
  path: string;
  pose: "front" | "side" | "back" | "other";
  takenOn: string;
  checkinId?: string | null;
}): Promise<TrackingResult> {
  const ctx = await ctxOrFail();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  if (!input.path.startsWith(`${ctx.client.id}/`)) return { ok: false, error: "Ruta no válida." };
  const supabase = await createClient();
  const { error } = await supabase.from("progress_photos").insert({
    client_id: ctx.client.id,
    storage_path: input.path,
    pose: input.pose,
    taken_on: input.takenOn,
    checkin_id: input.checkinId ?? null,
  });
  if (error) return { ok: false, error: "No se ha podido guardar la foto." };
  revalidatePath("/progreso/fotos");
  return { ok: true };
}

export async function deleteProgressPhoto(photoId: string): Promise<TrackingResult> {
  const ctx = await ctxOrFail();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("client_id", ctx.client.id)
    .single();
  if (data) {
    await supabase.storage.from("progress-photos").remove([data.storage_path]);
    await supabase.from("progress_photos").delete().eq("id", photoId);
  }
  revalidatePath("/progreso/fotos");
  return { ok: true };
}

/** ¿Ha dado consentimiento para fotos de progreso? (último registro) */
export async function hasPhotoConsent(): Promise<boolean> {
  const ctx = await getClientContext();
  if (!ctx) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("current_consents")
    .select("granted")
    .eq("profile_id", ctx.viewer.id)
    .eq("kind", "progress_photos")
    .maybeSingle();
  return Boolean(data?.granted);
}

export async function grantPhotoConsent(): Promise<TrackingResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sin sesión." };
  const { recordConsents } = await import("@/features/legal/consents.server");
  await recordConsents(ctx.viewer.id, { progress_photos: true });
  revalidatePath("/progreso/fotos");
  return { ok: true };
}

const submitSchema = z.object({
  checkinId: z.uuid(),
  answers: z.record(z.string(), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])),
  metrics: z.record(z.string(), z.string().max(100)),
});

/** Envía un check-in: respuestas + métricas del día. Avisa a Jaime. */
export async function submitCheckin(input: z.input<typeof submitSchema>): Promise<TrackingResult> {
  const ctx = await ctxOrFail();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa las respuestas." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: checkin } = await supabase
    .from("checkins")
    .select("id, status, checkin_templates(questions)")
    .eq("id", d.checkinId)
    .eq("client_id", ctx.client.id)
    .single();
  if (!checkin || !["pending", "missed"].includes(checkin.status))
    return { ok: false, error: "Este check-in ya está enviado." };

  const questions = (checkin.checkin_templates?.questions ?? []) as {
    key: string;
    label: string;
    required?: boolean;
  }[];
  const missing = questions.filter(
    (q) => q.required && (d.answers[q.key] === undefined || d.answers[q.key] === null || d.answers[q.key] === ""),
  );
  if (missing.length) return { ok: false, error: `Falta responder: ${missing.map((m) => m.label).join(", ")}` };

  const answers = questions
    .filter((q) => d.answers[q.key] !== undefined)
    .map((q) => ({
      checkin_id: d.checkinId,
      client_id: ctx.client.id,
      question_key: q.key,
      question_label: q.label,
      value: d.answers[q.key] ?? null,
    }));
  if (answers.length) {
    const { error } = await supabase.from("checkin_answers").upsert(answers, { onConflict: "checkin_id,question_key" });
    if (error) return { ok: false, error: "No se han podido guardar las respuestas." };
  }

  const today = todayInMadrid();
  for (const [metricId, raw] of Object.entries(d.metrics)) {
    if (!raw.trim()) continue;
    const n = Number(raw.replace(",", "."));
    await supabase.from("metric_entries").upsert(
      {
        client_id: ctx.client.id,
        metric_id: metricId,
        recorded_on: today,
        value_num: Number.isFinite(n) ? n : null,
        value_text: Number.isFinite(n) ? null : raw.trim(),
        source: "checkin",
        checkin_id: d.checkinId,
      },
      { onConflict: "client_id,metric_id,recorded_on" },
    );
  }

  const { error } = await supabase
    .from("checkins")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", d.checkinId);
  if (error) return { ok: false, error: "No se ha podido enviar." };

  await createAdminClient().rpc("notify_staff", {
    p_type: "checkin_submitted",
    p_title: `Check-in de ${ctx.viewer.fullName}`,
    p_body: questions
      .slice(0, 3)
      .map((q) => `${q.label} ${String(d.answers[q.key] ?? "—")}`)
      .join("\n"),
    p_link: `/panel/clientes/${ctx.client.id}/checkins`,
    p_client_id: ctx.client.id,
  });
  await evaluateQuietly(ctx.client.id);
  revalidatePath("/progreso", "layout");
  revalidatePath("/hoy");
  return { ok: true };
}

export async function setOwnCustomField(fieldId: string, value: string): Promise<TrackingResult> {
  const ctx = await ctxOrFail();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_field_values")
    .update({ value: value.trim() ? value.trim().slice(0, 500) : null })
    .eq("client_id", ctx.client.id)
    .eq("field_id", fieldId);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  const { notifyProfileChanges } = await import("@/features/onboarding/notify-changes.server");
  await notifyProfileChanges(ctx.client.id);
  revalidatePath("/perfil");
  return { ok: true };
}
