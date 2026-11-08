import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Format, Modality, PartParams, Prescription } from "@/domain/training/prescription";

export type ExerciseRef = {
  id: string;
  name: string;
  modality: string;
  video_url: string | null;
  video_provider: string | null;
  instructions?: string | null;
  common_mistakes?: string | null;
};
export type ItemNode = {
  id: string;
  exercise_id: string | null;
  name: string | null;
  sort_order: number;
  superset_group: string | null;
  prescription: Prescription;
  notes: string | null;
  exercises: ExerciseRef | null;
};
export type PartNode = {
  id: string;
  sort_order: number;
  title: string | null;
  modality: Modality;
  format: Format;
  params: PartParams;
  notes: string | null;
  session_items: ItemNode[];
};
export type SessionNode = {
  id: string;
  title: string;
  day_index: number | null;
  sort_order: number;
  notes: string | null;
  published: boolean;
  session_parts: PartNode[];
};
export type WeekNode = {
  id: string;
  week_index: number;
  is_deload: boolean;
  notes: string | null;
  workout_sessions: SessionNode[];
};
export type BlockNode = {
  id: string;
  client_id: string | null;
  template_id: string | null;
  name: string;
  goal: string | null;
  starts_on: string | null;
  status: "draft" | "active" | "done";
  notes: string | null;
  workout_weeks: WeekNode[];
};

const TREE = `id, client_id, template_id, name, goal, starts_on, status, notes,
  workout_weeks(id, week_index, is_deload, notes,
    workout_sessions(id, title, day_index, sort_order, notes, published,
      session_parts(id, sort_order, title, modality, format, params, notes,
        session_items(id, exercise_id, name, sort_order, superset_group, prescription, notes,
          exercises(id, name, modality, video_url, video_provider, instructions, common_mistakes)))))`;

export function sortTree(b: BlockNode): BlockNode {
  b.workout_weeks.sort((x, y) => x.week_index - y.week_index);
  for (const w of b.workout_weeks) {
    w.workout_sessions.sort((x, y) => (x.day_index ?? 9) - (y.day_index ?? 9) || x.sort_order - y.sort_order);
    for (const s of w.workout_sessions) {
      s.session_parts.sort((x, y) => x.sort_order - y.sort_order);
      for (const p of s.session_parts) p.session_items.sort((x, y) => x.sort_order - y.sort_order);
    }
  }
  return b;
}

export async function getBlockTree(blockId: string): Promise<BlockNode | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("workout_blocks").select(TREE).eq("id", blockId).maybeSingle();
  return data ? sortTree(data as unknown as BlockNode) : null;
}

/** Bloques visibles de un cliente (RLS: el cliente no ve borradores). */
export async function getClientBlocks(clientId: string): Promise<BlockNode[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_blocks")
    .select(TREE)
    .eq("client_id", clientId)
    .order("starts_on", { ascending: false, nullsFirst: false });
  return ((data ?? []) as unknown as BlockNode[]).map(sortTree);
}

export async function getSessionWithContext(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select(
      `id, title, day_index, notes, client_id,
       workout_weeks(week_index, is_deload, workout_blocks(id, name, starts_on)),
       session_parts(id, sort_order, title, modality, format, params, notes,
         session_items(id, exercise_id, name, sort_order, superset_group, prescription, notes,
           exercises(id, name, modality, video_url, video_provider, instructions, common_mistakes)))`,
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) return null;
  const s = data as unknown as SessionNode & {
    client_id: string | null;
    workout_weeks: {
      week_index: number;
      is_deload: boolean;
      workout_blocks: { id: string; name: string; starts_on: string | null } | null;
    } | null;
  };
  s.session_parts.sort((a, b) => a.sort_order - b.sort_order);
  for (const p of s.session_parts) p.session_items.sort((a, b) => a.sort_order - b.sort_order);
  return s;
}

export async function getExerciseLibrary(includeInactive = false) {
  const supabase = await createClient();
  let q = supabase
    .from("exercises")
    .select("id, name, modality, muscle_groups, equipment, video_url, video_provider, tags, is_active")
    .order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  return data ?? [];
}

/** Bloque vigente del cliente, semana actual y sesiones ya hechas. */
export async function getTrainingOverview(clientId: string, today: string) {
  const { currentWeekIndex, weekdayMondayFirst } = await import("@/domain/training/week");
  const blocks = await getClientBlocks(clientId);
  const active = blocks.filter((b) => b.status === "active" && b.starts_on && b.starts_on <= today);
  const block =
    active.sort((a, b) => (b.starts_on ?? "").localeCompare(a.starts_on ?? ""))[0] ??
    blocks.find((b) => b.status === "active") ??
    null;
  const weekIndex = block ? currentWeekIndex(block.starts_on, today) : null;
  const currentWeek = block ? (block.workout_weeks.find((w) => w.week_index === weekIndex) ?? null) : null;

  const supabase = await createClient();
  const sessionIds = block ? block.workout_weeks.flatMap((w) => w.workout_sessions.map((s) => s.id)) : [];
  const { data: logs } = sessionIds.length
    ? await supabase
        .from("workout_logs")
        .select("id, session_id, completed_at")
        .eq("client_id", clientId)
        .in("session_id", sessionIds)
        .not("completed_at", "is", null)
    : { data: [] as { id: string; session_id: string | null; completed_at: string | null }[] };
  const done = new Set((logs ?? []).map((l) => l.session_id));
  const todayDay = weekdayMondayFirst(today);
  const todaySession = currentWeek?.workout_sessions.find((s) => s.day_index === todayDay) ?? null;
  return { block, blocks, weekIndex, currentWeek, done, todaySession };
}

/** Últimas series de cada ejercicio (para «la última vez hiciste…»). */
export async function getPreviousSets(clientId: string, exerciseIds: string[]) {
  if (!exerciseIds.length) return {};
  const supabase = await createClient();
  const { data } = await supabase
    .from("set_logs")
    .select("exercise_id, workout_log_id, set_index, reps, load_kg, duration_s, distance_m, created_at")
    .eq("client_id", clientId)
    .in("exercise_id", exerciseIds)
    .order("created_at", { ascending: false })
    .limit(400);
  const out: Record<
    string,
    { reps: number | null; load_kg: number | null; duration_s: number | null; distance_m: number | null }[]
  > = {};
  const lastLog: Record<string, string> = {};
  for (const s of data ?? []) {
    if (!s.exercise_id) continue;
    lastLog[s.exercise_id] ??= s.workout_log_id;
    if (s.workout_log_id !== lastLog[s.exercise_id]) continue;
    (out[s.exercise_id] ??= []).push({
      reps: s.reps,
      load_kg: s.load_kg === null ? null : Number(s.load_kg),
      duration_s: s.duration_s,
      distance_m: s.distance_m,
    });
  }
  for (const k of Object.keys(out)) out[k]!.reverse();
  return out;
}
