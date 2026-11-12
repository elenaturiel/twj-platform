import "server-only";
import { addDays } from "@/domain/billing/renewal";
import { mondayOf } from "@/domain/training/week";
import { madridInstant } from "@/domain/agenda/slots";
import {
  bestTrainingStreak,
  challengeProgress,
  checkinStreak,
  milestoneBadges,
  parseRule,
  trainingStreak,
  type WeekStat,
} from "@/domain/engagement/engagement";
import { todayInMadrid } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

const madridDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/**
 * Recalcula rachas, medallas y retos de un cliente. Se llama al guardar un
 * entreno, al entregar un check-in, al cerrar una cita y a diario por cron.
 * Idempotente: puede ejecutarse las veces que haga falta.
 * Devuelve las medallas nuevas (para avisar y animar).
 */
export async function evaluateClient(clientId: string): Promise<string[]> {
  const admin = createAdminClient();
  const today = todayInMadrid();
  const thisMonday = mondayOf(today);
  const since = addDays(thisMonday, -26 * 7);

  const [{ data: blocks }, { data: logs }, { data: checkins }, { count: prs }, { count: live }, { data: client }] =
    await Promise.all([
      admin
        .from("workout_blocks")
        .select("starts_on, status, workout_weeks(week_index, workout_sessions(id, published))")
        .eq("client_id", clientId)
        .in("status", ["active", "done"])
        .not("starts_on", "is", null),
      admin.from("workout_logs").select("completed_at").eq("client_id", clientId).not("completed_at", "is", null),
      admin
        .from("checkins")
        .select("due_on, status, submitted_at")
        .eq("client_id", clientId)
        .order("due_on", { ascending: false })
        .limit(30),
      admin.from("personal_records").select("id", { count: "exact", head: true }).eq("client_id", clientId),
      admin
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("type_key", "live_training")
        .eq("status", "completed"),
      admin.from("clients").select("profile_id").eq("id", clientId).single(),
    ]);

  // Semanas: planificado (sesiones publicadas de bloques activos/hechos) vs hecho (entrenos completados)
  const planned = new Map<string, number>();
  for (const b of blocks ?? []) {
    for (const w of b.workout_weeks ?? []) {
      const monday = mondayOf(addDays(b.starts_on!, w.week_index * 7));
      if (monday < since) continue;
      const n = (w.workout_sessions ?? []).filter((s) => s.published).length;
      planned.set(monday, (planned.get(monday) ?? 0) + n);
    }
  }
  const done = new Map<string, number>();
  for (const l of logs ?? []) {
    const monday = mondayOf(madridDate(l.completed_at!));
    done.set(monday, (done.get(monday) ?? 0) + 1);
  }
  const weeks: WeekStat[] = [...new Set([...planned.keys(), ...done.keys()])]
    .filter((m) => m >= since && m <= thisMonday)
    .map((m) => ({
      weekStart: m,
      planned: planned.get(m) ?? 0,
      done: Math.min(done.get(m) ?? 0, planned.get(m) ?? 0),
    }));

  const tWeeks = trainingStreak(weeks, thisMonday);
  const cStreak = checkinStreak(
    (checkins ?? []).map((c) => ({
      dueOn: c.due_on,
      status: c.status,
      submittedAt: c.submitted_at ? madridDate(c.submitted_at) : null,
    })),
    today,
  );
  const current = weeks.find((w) => w.weekStart === thisMonday);
  const { data: prev } = await admin
    .from("client_streaks")
    .select("best_training_weeks, best_checkin_streak")
    .eq("client_id", clientId)
    .maybeSingle();
  await admin.from("client_streaks").upsert({
    client_id: clientId,
    training_weeks: tWeeks,
    best_training_weeks: Math.max(prev?.best_training_weeks ?? 0, bestTrainingStreak(weeks), tWeeks),
    checkin_streak: cStreak,
    best_checkin_streak: Math.max(prev?.best_checkin_streak ?? 0, cStreak),
    week_done: done.get(thisMonday) ?? 0,
    week_planned: current?.planned ?? 0,
    updated_at: new Date().toISOString(),
  });

  // Medallas por hitos
  const earned = milestoneBadges({
    workouts: logs?.length ?? 0,
    prs: prs ?? 0,
    trainingWeeks: tWeeks,
    checkinStreak: cStreak,
    liveSessions: live ?? 0,
  });
  const awarded: { key: string; source?: string }[] = earned.map((key) => ({ key }));

  // Retos en los que participa (activos o recién acabados)
  const { data: parts } = await admin
    .from("challenge_participants")
    .select(
      "challenge_id, progress, completed_at, challenges(id, title, starts_on, ends_on, rule, badge_key, is_active)",
    )
    .eq("client_id", clientId)
    .is("completed_at", null);
  for (const p of parts ?? []) {
    const c = p.challenges;
    const rule = parseRule(c?.rule);
    if (!c || !rule || c.starts_on > today || addDays(c.ends_on, 7) < today) continue;
    const from = madridInstant(c.starts_on, "00:00").toISOString();
    const to = madridInstant(addDays(c.ends_on < today ? c.ends_on : today, 1), "00:00").toISOString();
    const inWindow = async (): Promise<number> => {
      switch (rule.type) {
        case "workouts_count":
          return (logs ?? []).filter((l) => l.completed_at! >= from && l.completed_at! < to).length;
        case "checkins_count":
          return (checkins ?? []).filter((x) => x.submitted_at && x.submitted_at >= from && x.submitted_at < to).length;
        case "prs_count": {
          const { count } = await admin
            .from("personal_records")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId)
            .gte("achieved_at", from)
            .lt("achieved_at", to);
          return count ?? 0;
        }
        case "live_sessions": {
          const { count } = await admin
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("client_id", clientId)
            .eq("type_key", "live_training")
            .eq("status", "completed")
            .gte("starts_at", from)
            .lt("starts_at", to);
          return count ?? 0;
        }
        case "metric_total": {
          const { data: def } = await admin
            .from("metric_definitions")
            .select("id")
            .eq("key", rule.metric)
            .maybeSingle();
          if (!def) return 0;
          const { data: entries } = await admin
            .from("metric_entries")
            .select("value_num")
            .eq("client_id", clientId)
            .eq("metric_id", def.id)
            .gte("recorded_on", c.starts_on)
            .lte("recorded_on", c.ends_on);
          return (entries ?? []).reduce((s, e) => s + Number(e.value_num ?? 0), 0);
        }
      }
    };
    const raw = await inWindow();
    const progress = challengeProgress(rule, {
      workouts: raw,
      checkins: raw,
      prs: raw,
      liveSessions: raw,
      metricTotals: { [rule.type === "metric_total" ? rule.metric : ""]: raw },
    });
    const completed = progress >= rule.target;
    if (progress !== Number(p.progress) || completed) {
      await admin
        .from("challenge_participants")
        .update({ progress, completed_at: completed ? new Date().toISOString() : null })
        .eq("challenge_id", p.challenge_id)
        .eq("client_id", clientId);
    }
    if (completed) awarded.push({ key: c.badge_key ?? "challenge_done", source: c.id });
  }

  // Inserta solo las nuevas
  const { data: have } = await admin.from("client_badges").select("badge_key").eq("client_id", clientId);
  const owned = new Set((have ?? []).map((b) => b.badge_key));
  const fresh = awarded.filter((a, i) => !owned.has(a.key) && awarded.findIndex((x) => x.key === a.key) === i);
  if (fresh.length) {
    await admin.from("client_badges").upsert(
      fresh.map((a) => ({ client_id: clientId, badge_key: a.key, source_id: a.source ?? null })),
      { onConflict: "client_id,badge_key", ignoreDuplicates: true },
    );
    const { data: names } = await admin
      .from("badges")
      .select("key, name")
      .in(
        "key",
        fresh.map((f) => f.key),
      );
    if (client?.profile_id) {
      for (const b of names ?? []) {
        await admin.rpc("notify", {
          p_profile_id: client.profile_id,
          p_type: "badge_awarded",
          p_title: `Nueva medalla: ${b.name}`,
          p_body: "Entra en tu colección para verla.",
          p_link: "/medallas",
          p_client_id: clientId,
        });
      }
    }
  }
  return fresh.map((f) => f.key);
}

/** Cron diario: todos los clientes activos (rachas que caducan, retos de métricas…). */
export async function runEngagementJob() {
  const admin = createAdminClient();
  const { data: clients } = await admin
    .from("clients")
    .select("id")
    .eq("status", "active")
    .not("onboarding_completed_at", "is", null);
  let awarded = 0;
  for (const c of clients ?? []) awarded += (await evaluateClient(c.id)).length;
  return { clients: clients?.length ?? 0, awarded };
}

/**
 * Recalcula sin hacer fallar la acción que lo llama y con un tope de tiempo.
 * Se espera dentro de la acción para que en serverless no se corte a medias.
 */
export async function evaluateQuietly(clientId: string, ms = 3000) {
  await Promise.race([
    evaluateClient(clientId).catch((e) => console.error("[engagement]", e)),
    new Promise((r) => setTimeout(r, ms)),
  ]);
}
