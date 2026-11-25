import "server-only";
import { sendEmail } from "@/lib/email/send";
import { toParagraphs } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Envía los emails masivos HYROX pendientes, por tandas (cron cada minuto).
 * Solo a apuntados con consentimiento y que no se han dado de baja; cada
 * email lleva su enlace de baja.
 */
export async function runHyroxMailings(siteUrl: string, batch = 40) {
  const admin = createAdminClient();
  const { data: mailings } = await admin
    .from("hyrox_mailings")
    .select("id, subject, body")
    .in("status", ["queued", "sending"])
    .order("created_at")
    .limit(3);
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const m of mailings ?? []) {
    await admin.from("hyrox_mailings").update({ status: "sending" }).eq("id", m.id);
    const { data: pending } = await admin
      .from("hyrox_mailing_recipients")
      .select("waitlist_id, waitlist_hyrox(email, status, consent_at, unsubscribe_token)")
      .eq("mailing_id", m.id)
      .eq("status", "pending")
      .limit(batch);
    for (const r of pending ?? []) {
      const w = r.waitlist_hyrox;
      let status: "sent" | "failed" | "skipped" = "skipped";
      let error: string | null = null;
      if (w?.email && w.consent_at && w.status !== "unsubscribed") {
        const res = await sendEmail({
          to: w.email,
          subject: m.subject,
          preview: m.subject,
          paragraphs: toParagraphs(m.body),
          footer: `Te escribimos porque te apuntaste a la lista HYROX de Train with Jaime. Darte de baja: ${new URL(`/hyrox/baja?t=${w.unsubscribe_token}`, siteUrl)}`,
        });
        status = res.ok ? "sent" : "failed";
        error = res.ok ? null : (res.error ?? "error");
      }
      await admin
        .from("hyrox_mailing_recipients")
        .update({ status, error, sent_at: status === "sent" ? new Date().toISOString() : null })
        .eq("mailing_id", m.id)
        .eq("waitlist_id", r.waitlist_id);
      result[status]++;
    }
    const { count: left } = await admin
      .from("hyrox_mailing_recipients")
      .select("waitlist_id", { count: "exact", head: true })
      .eq("mailing_id", m.id)
      .eq("status", "pending");
    const { count: sent } = await admin
      .from("hyrox_mailing_recipients")
      .select("waitlist_id", { count: "exact", head: true })
      .eq("mailing_id", m.id)
      .eq("status", "sent");
    await admin
      .from("hyrox_mailings")
      .update({ sent: sent ?? 0, status: left ? "sending" : "sent" })
      .eq("id", m.id);
  }
  return result;
}
