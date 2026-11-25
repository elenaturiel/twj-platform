"use server";

import { evaluateQuietly } from "@/features/engagement/engine.server";
import { revalidatePath } from "next/cache";
import { getClientContext } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bestKey, newRecords, recordCandidates, type BestMap, type RecordCandidate } from "@/domain/training/records";
import { formatDuration } from "@/domain/training/time";
import { logSchema, type WorkoutLogInput } from "./schemas";

export type SaveLogResult =
  { ok: true; records: { label: string; value: string }[] } | { ok: false; error: string; retryable?: boolean };

const RECORD_LABELS: Record<RecordCandidate["recordType"], string> = {
  max_load: "Carga máxima",
  e1rm: "1RM estimado",
  best_time: "Mejor tiempo",
  longest_distance: "Distancia más larga",
  hyrox_station: "Mejor tiempo en estación",
};

/**
 * Guarda un entreno completo. Es idempotente (el id lo genera el móvil): si se
 * reenvía al recuperar la conexión, sustituye las series en vez de duplicarlas.
 */
export async function saveWorkoutLog(input: WorkoutLogInput): Promise<SaveLogResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { ok: false, error: "Tu cuenta no tiene acceso ahora mismo." };
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos del entreno no válidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const clientId = ctx.client.id;

  if (d.session_id) {
    const { data: s } = await supabase.from("workout_sessions").select("id").eq("id", d.session_id).maybeSingle();
    if (!s) return { ok: false, error: "Esa sesión no es tuya." };
  }

  const { data: previous } = await supabase.from("workout_logs").select("id").eq("id", d.id).maybeSingle();
  const { error: logErr } = await supabase.from("workout_logs").upsert({
    id: d.id,
    client_id: clientId,
    session_id: d.session_id,
    title: d.title,
    started_at: d.started_at,
    completed_at: d.completed_at,
    total_time_s: d.total_time_s,
    session_rpe: d.session_rpe,
    feeling: d.feeling,
    comment: d.comment,
  });
  if (logErr) return { ok: false, error: "No se ha podido guardar. Lo reintentamos.", retryable: true };

  await supabase.from("set_logs").delete().eq("workout_log_id", d.id);
  const sets = d.sets.filter(
    (s) => s.reps != null || s.load_kg != null || s.duration_s != null || s.distance_m != null,
  );
  if (sets.length) {
    const { error: setErr } = await supabase.from("set_logs").insert(
      sets.map((s) => ({
        ...s,
        workout_log_id: d.id,
        client_id: clientId,
        pace_s_per_km:
          s.distance_m && s.duration_s && s.distance_m >= 200 ? Math.round(s.duration_s / (s.distance_m / 1000)) : null,
      })),
    );
    if (setErr) return { ok: false, error: "No se han podido guardar las series. Lo reintentamos.", retryable: true };
  }

  // Récords: solo la primera vez que se guarda este entreno
  const records: { label: string; value: string }[] = [];
  if (!previous) {
    const candidates = recordCandidates(
      sets.map((s) => ({
        id: s.id,
        exerciseId: s.exercise_id,
        reps: s.reps,
        loadKg: s.load_kg,
        durationS: s.duration_s,
        distanceM: s.distance_m,
        stationKey: s.station_key,
      })),
    );
    if (candidates.length) {
      const { data: prior } = await supabase
        .from("personal_records")
        .select("record_type, exercise_id, record_key, value")
        .eq("client_id", clientId);
      const best: BestMap = new Map();
      for (const r of prior ?? []) {
        const k = bestKey({
          recordType: r.record_type as RecordCandidate["recordType"],
          exerciseId: r.exercise_id,
          recordKey: r.record_key,
        });
        const v = Number(r.value);
        const lower = r.record_type === "best_time" || r.record_type === "hyrox_station";
        const cur = best.get(k);
        if (cur === undefined || (lower ? v < cur : v > cur)) best.set(k, v);
      }
      const fresh = newRecords(candidates, best);
      if (fresh.length) {
        await supabase.from("personal_records").insert(
          fresh.map((r) => ({
            client_id: clientId,
            exercise_id: r.exerciseId,
            record_type: r.recordType,
            record_key: r.recordKey,
            value: r.value,
            unit: r.unit,
            set_log_id: r.setLogId,
            workout_log_id: d.id,
          })),
        );
        const exerciseIds = [...new Set(fresh.map((r) => r.exerciseId).filter(Boolean))] as string[];
        const { data: names } = exerciseIds.length
          ? await supabase.from("exercises").select("id, name").in("id", exerciseIds)
          : { data: [] as { id: string; name: string }[] };
        for (const r of fresh) {
          const name = names?.find((n) => n.id === r.exerciseId)?.name;
          const value =
            r.unit === "kg"
              ? `${r.value.toLocaleString("es-ES")} kg`
              : r.unit === "s"
                ? formatDuration(r.value)
                : `${(r.value / 1000).toLocaleString("es-ES")} km`;
          const key =
            r.recordType === "best_time"
              ? ` (${Number(r.recordKey) / 1000} km)`
              : r.recordType === "hyrox_station"
                ? ` (${r.recordKey})`
                : "";
          records.push({ label: `${RECORD_LABELS[r.recordType]}${name ? ` · ${name}` : ""}${key}`, value });
        }
      }
    }

    // Aviso a Jaime (in-app; email/push según sus preferencias o en el resumen diario)
    const admin = createAdminClient();
    await admin.rpc("notify_staff", {
      p_type: "workout_completed",
      p_title: `${ctx.viewer.fullName} ha completado «${d.title ?? "un entreno"}»`,
      p_body: [
        d.session_rpe != null ? `RPE ${d.session_rpe}` : null,
        d.feeling ? `Sensaciones ${d.feeling}/5` : null,
        records.length ? `🏆 ${records.length} récord${records.length > 1 ? "s" : ""}` : null,
        d.comment ? `«${d.comment.slice(0, 140)}»` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      p_link: `/panel/clientes/${clientId}/entreno`,
      p_client_id: clientId,
    });
  }

  revalidatePath("/entreno", "layout");
  await evaluateQuietly(ctx.client.id);
  revalidatePath("/hoy");
  return { ok: true, records };
}

export async function deleteWorkoutLog(logId: string) {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false as const };
  const supabase = await createClient();
  await supabase.from("workout_logs").delete().eq("id", logId).eq("client_id", ctx.client.id);
  revalidatePath("/entreno", "layout");
  return { ok: true as const };
}
