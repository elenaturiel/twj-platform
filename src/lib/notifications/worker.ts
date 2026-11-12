import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNELS, type OutboxPayload } from "./channels";

const MAX_ATTEMPTS = 5;

/**
 * Procesa la cola de email/push. Lo llama /api/cron/notifications (cada minuto).
 * Las entradas con digest=true se dejan para el resumen diario.
 */
export async function processOutbox(siteUrl: string, limit = 50) {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("notification_outbox")
    .select("id, profile_id, channel, payload, attempts, profiles(email)")
    .eq("status", "pending")
    .eq("digest", false)
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for")
    .limit(limit);

  const results = { sent: 0, skipped: 0, failed: 0 };
  for (const item of items ?? []) {
    // Reclamar la fila (evita dobles envíos si dos crons se solapan)
    const { data: claimed } = await admin
      .from("notification_outbox")
      .update({ status: "sending", attempts: item.attempts + 1 })
      .eq("id", item.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed?.length) continue;

    const channel = CHANNELS[item.channel as "email" | "push"];
    const res = await channel.deliver(
      { profileId: item.profile_id, email: item.profiles?.email ?? "" },
      item.payload as OutboxPayload,
      siteUrl,
    );
    const retry = res.status === "failed" && item.attempts + 1 < MAX_ATTEMPTS;
    await admin
      .from("notification_outbox")
      .update({
        status: retry ? "pending" : res.status,
        error: res.error ?? null,
        sent_at: res.status === "sent" ? new Date().toISOString() : null,
        // Reintento con espera creciente: 2, 4, 8, 16 min
        scheduled_for: retry ? new Date(Date.now() + 2 ** (item.attempts + 1) * 60_000).toISOString() : undefined,
      })
      .eq("id", item.id);
    results[res.status]++;
  }
  return results;
}

/** Resumen diario: agrupa las notificaciones marcadas como digest de cada persona en un email. */
export async function sendDigests(siteUrl: string) {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("notification_outbox")
    .select("id, profile_id, channel, payload, profiles(email)")
    .eq("status", "pending")
    .eq("digest", true)
    .eq("channel", "email");

  const byProfile = new Map<string, { email: string; ids: string[]; lines: string[] }>();
  for (const it of items ?? []) {
    const entry = byProfile.get(it.profile_id) ?? { email: it.profiles?.email ?? "", ids: [], lines: [] };
    const p = it.payload as OutboxPayload;
    entry.ids.push(it.id);
    entry.lines.push(`• ${p.title}${p.body ? ` — ${p.body}` : ""}`);
    byProfile.set(it.profile_id, entry);
  }

  for (const [profileId, entry] of byProfile) {
    const res = await CHANNELS.email.deliver(
      { profileId, email: entry.email },
      { title: `Resumen del día (${entry.lines.length})`, body: entry.lines.join("\n"), link: "/panel" },
      siteUrl,
    );
    await admin
      .from("notification_outbox")
      .update({
        status: res.status === "failed" ? "failed" : res.status,
        sent_at: new Date().toISOString(),
        error: res.error ?? null,
      })
      .in("id", entry.ids);
  }
  // Los push en modo digest no se envían (el resumen va por email)
  await admin
    .from("notification_outbox")
    .update({ status: "skipped" })
    .eq("status", "pending")
    .eq("digest", true)
    .eq("channel", "push");
  return { digests: byProfile.size };
}
