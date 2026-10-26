import "server-only";
import webpush from "web-push";
import { serverEnv } from "@/lib/env.server";
import { sendEmail } from "@/lib/email/send";
import { toParagraphs } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

export type OutboxPayload = { title: string; body?: string | null; link?: string | null; data?: unknown };
export type Recipient = { profileId: string; email: string };
export type DeliveryResult = { status: "sent" | "skipped" | "failed"; error?: string };

/**
 * Un canal de entrega. Para añadir APNs/FCM (Fase 9) basta con implementar
 * esta interfaz y registrarlo en CHANNELS: el resto del sistema no cambia.
 */
export interface NotificationChannel {
  readonly name: "email" | "push";
  deliver(to: Recipient, payload: OutboxPayload, siteUrl: string): Promise<DeliveryResult>;
}

export const emailChannel: NotificationChannel = {
  name: "email",
  async deliver(to, payload, siteUrl) {
    const res = await sendEmail({
      to: to.email,
      subject: payload.title,
      preview: payload.title,
      paragraphs: toParagraphs(payload.body ?? payload.title),
      cta: payload.link ? { label: "Abrir en la app", href: new URL(payload.link, siteUrl).toString() } : undefined,
    });
    if (!res.ok) return { status: "failed", error: res.error };
    return { status: res.skipped ? "skipped" : "sent" };
  },
};

export const webPushChannel: NotificationChannel = {
  name: "push",
  async deliver(to, payload) {
    const env = serverEnv();
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return { status: "skipped" };
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("profile_id", to.profileId);
    if (!subs?.length) return { status: "skipped" };

    let sent = 0;
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: payload.title, body: payload.body, link: payload.link }),
        );
        sent++;
        await admin.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410: la suscripción ya no existe en el navegador
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
    return sent > 0 ? { status: "sent" } : { status: "failed", error: "Ningún dispositivo aceptó el push" };
  },
};

export const CHANNELS: Record<"email" | "push", NotificationChannel> = {
  email: emailChannel,
  push: webPushChannel,
};
