import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/dal";
import { serverEnv } from "@/lib/env.server";
import { createClient } from "@/lib/supabase/server";
import { typesFor } from "@/domain/notifications/catalog";
import { NotificationPreferences } from "@/features/notifications/ui/preferences";
import { PushToggle } from "@/features/notifications/ui/push-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mis avisos" };

export default async function StaffNotificationPrefs() {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("type, channel, enabled, digest")
    .eq("profile_id", viewer.id);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/panel/ajustes" className="text-sm text-muted-foreground">
        ← Ajustes
      </Link>
      <h1 className="text-3xl font-extrabold">Mis avisos</h1>
      <Card>
        <CardHeader>
          <CardTitle>Push en este dispositivo</CardTitle>
          <CardDescription>Actívalo en tu móvil para enterarte de mensajes y reservas al momento.</CardDescription>
        </CardHeader>
        <CardContent>
          <PushToggle vapidPublicKey={serverEnv().VAPID_PUBLIC_KEY ?? null} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Qué me llega y por dónde</CardTitle>
          <CardDescription>
            «Resumen diario» agrupa ese aviso en un único email a la hora configurada en Ajustes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferences
            types={typesFor("staff")}
            initial={(data ?? []).map((r) => ({ ...r, channel: r.channel as "email" | "push" }))}
            allowDigest
          />
        </CardContent>
      </Card>
    </div>
  );
}
