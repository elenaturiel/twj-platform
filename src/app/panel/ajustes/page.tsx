import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DigestToggle, SettingRow } from "@/features/config/settings-form";

export const metadata: Metadata = { title: "Ajustes" };

const EDITABLE: Record<string, string> = {
  "contact.whatsapp_number": "WhatsApp de urgencias",
  "contact.email": "Email de contacto",
  "billing.grace_days": "Días de gracia tras un pago vencido",
  "billing.manual_reminder_offsets": "Recordatorios de pago manual (días respecto al vencimiento)",
  "billing.extra_session_price_cents": "Precio sesión extra (céntimos)",
  "billing.max_total_discount_percent": "Tope de la suma de descuentos (%; null = sin tope)",
  "notifications.digest_hour": "Hora del resumen diario",
  "checkins.default_weekday": "Día del check-in por defecto (0 = domingo)",
};

export default async function SettingsPage() {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const [{ data: settings }, { data: pref }] = await Promise.all([
    supabase.from("settings").select("key, value, description").in("key", Object.keys(EDITABLE)),
    supabase
      .from("notification_preferences")
      .select("digest")
      .eq("profile_id", viewer.id)
      .eq("type", "*")
      .eq("channel", "email")
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-extrabold">Ajustes</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis avisos</CardTitle>
        </CardHeader>
        <CardContent>
          <DigestToggle digest={pref?.digest ?? false} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Negocio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(EDITABLE).map(([key, label]) => {
            const s = settings?.find((x) => x.key === key);
            return (
              <SettingRow
                key={key}
                settingKey={key}
                label={label}
                description={s?.description ?? null}
                value={s?.value ?? null}
              />
            );
          })}
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Marca (colores, logo), plantillas de email, disponibilidad y textos legales: en sus fases (ver docs/PLAN.md).
      </p>
    </div>
  );
}
