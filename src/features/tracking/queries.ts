import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MetricDef = {
  id: string;
  key: string;
  name: string;
  type: "number" | "scale" | "text" | "photo";
  unit: string | null;
  suggested_frequency: string;
  higher_is_better: boolean | null;
};
export type ActiveMetric = MetricDef & {
  frequency: string;
  target_value: number | null;
  target_direction: string | null;
  entries: { id: string; recorded_on: string; value_num: number | null; value_text: string | null }[];
};

/** Métricas activas de un cliente con su histórico (ordenado por fecha). */
export async function getActiveMetrics(clientId: string): Promise<ActiveMetric[]> {
  const supabase = await createClient();
  const [{ data: cm }, { data: entries }] = await Promise.all([
    supabase
      .from("client_metrics")
      .select(
        "frequency, target_value, target_direction, metric_definitions(id, key, name, type, unit, suggested_frequency, higher_is_better, sort_order)",
      )
      .eq("client_id", clientId)
      .eq("is_active", true),
    supabase
      .from("metric_entries")
      .select("id, metric_id, recorded_on, value_num, value_text")
      .eq("client_id", clientId)
      .order("recorded_on"),
  ]);
  return (cm ?? [])
    .filter((m) => m.metric_definitions)
    .sort((a, b) => (a.metric_definitions!.sort_order ?? 0) - (b.metric_definitions!.sort_order ?? 0))
    .map((m) => {
      const d = m.metric_definitions!;
      return {
        id: d.id,
        key: d.key,
        name: d.name,
        type: d.type as MetricDef["type"],
        unit: d.unit,
        suggested_frequency: d.suggested_frequency,
        higher_is_better: d.higher_is_better,
        frequency: m.frequency,
        target_value: m.target_value === null ? null : Number(m.target_value),
        target_direction: m.target_direction,
        entries: (entries ?? [])
          .filter((e) => e.metric_id === d.id)
          .map((e) => ({
            id: e.id,
            recorded_on: e.recorded_on,
            value_num: e.value_num === null ? null : Number(e.value_num),
            value_text: e.value_text,
          })),
      };
    });
}

/** Fotos de progreso con URL firmada de 5 minutos (bucket privado). */
export async function getPhotos(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("progress_photos")
    .select("id, storage_path, pose, taken_on, checkin_id")
    .eq("client_id", clientId)
    .order("taken_on", { ascending: false });
  const photos = data ?? [];
  if (!photos.length) return [];
  const { data: signed } = await supabase.storage.from("progress-photos").createSignedUrls(
    photos.map((p) => p.storage_path),
    300,
  );
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  return photos.map((p) => ({ ...p, url: urls.get(p.storage_path) ?? null }));
}

export type CheckinQuestion = {
  key: string;
  label: string;
  type: "text" | "scale" | "number" | "yesno";
  required?: boolean;
};

export async function getCheckins(clientId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select(
      "id, due_on, status, submitted_at, reviewed_at, staff_reply, staff_voice_path, checkin_templates(name, questions, include_metrics, include_photos), checkin_answers(question_key, question_label, value)",
    )
    .eq("client_id", clientId)
    .order("due_on", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function signedVoiceUrl(path: string | null) {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("voice-notes").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
