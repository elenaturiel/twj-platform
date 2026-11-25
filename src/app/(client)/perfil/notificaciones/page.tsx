import type { Metadata } from "next";
import Link from "next/link";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { serverEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { typesFor } from "@/domain/notifications/catalog";
import { NotificationPreferences } from "@/features/notifications/ui/preferences";
import { PushToggle } from "@/features/notifications/ui/push-toggle";

export const metadata: Metadata = { title: "Avisos" };

export default async function ClientNotificationPrefs() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("type, channel, enabled, digest")
    .eq("profile_id", ctx.viewer.id);
  return (
    <div className="space-y-5">
      <Link href="/perfil" className="text-sm text-muted-foreground">
        ← Perfil
      </Link>
      <h1 className="text-3xl font-extrabold">Avisos</h1>
      <section className="space-y-2 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Avisos en el móvil</h2>
        <p className="text-sm text-muted-foreground">
          Recibe las respuestas de Jaime y los recordatorios de tus citas al momento.
        </p>
        <PushToggle vapidPublicKey={serverEnv().VAPID_PUBLIC_KEY ?? null} />
      </section>
      <NotificationPreferences
        types={typesFor("client")}
        initial={(data ?? []).map((r) => ({ ...r, channel: r.channel as "email" | "push" }))}
        allowDigest={false}
      />
    </div>
  );
}
