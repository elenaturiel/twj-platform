import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientAdminForm } from "@/features/clients/staff-forms";
import { formatDate } from "@/features/clients/ui";

export default async function ClientSummary({ params }: PageProps<"/panel/clientes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: c }, { data: sub }, { data: lastChange }, { data: health }, { data: credits }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, status, modalities, tags, started_at, last_activity_at, onboarding_completed_at, guardian_status, is_minor, profiles(email, phone), client_intake(goal)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("subscriptions")
      .select("status, amount_cents, billing_interval, current_period_end, grace_until")
      .eq("client_id", id)
      .neq("status", "cancelled")
      .maybeSingle(),
    supabase
      .from("profile_changes")
      .select("created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("health_screenings")
      .select("has_flags, reviewed_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("session_credits").select("credit_type, delta").eq("client_id", id),
  ]);
  if (!c) return null;

  const alerts = [
    c.status === "past_due" && `Pago vencido · acceso hasta el ${formatDate(sub?.grace_until)}`,
    c.status === "pending_payment" && "Pendiente del primer pago",
    !c.onboarding_completed_at && c.status === "active" && "No ha rellenado la ficha de onboarding",
    health?.has_flags && !health.reviewed_at && "Respondió SÍ en el cuestionario de salud (revisar)",
    c.is_minor && c.guardian_status !== "confirmed" && "Menor sin autorización del tutor",
  ].filter(Boolean) as string[];

  const balance = (type: string) =>
    (credits ?? []).filter((x) => x.credit_type === type).reduce((s, x) => s + x.delta, 0);
  const rows = [
    ["Email", c.profiles?.email],
    ["Teléfono", c.profiles?.phone ?? "—"],
    ["Objetivo", c.client_intake?.goal ?? "—"],
    ["Cliente desde", formatDate(c.started_at)],
    ["Cuota", sub ? `${formatEuros(sub.amount_cents)} / ${sub.billing_interval === "year" ? "año" : "mes"}` : "—"],
    ["Próxima renovación", formatDate(sub?.current_period_end)],
    ["Última actividad", formatDate(c.last_activity_at)],
    ["Último cambio de ficha", formatDate(lastChange?.created_at, true)],
    ["Créditos entreno en directo", String(balance("live_training"))],
    ["Créditos videollamada mensual", String(balance("monthly_call"))],
    ["Racha / adherencia / último check-in", "Llega con las Fases 2–3"],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        {alerts.length ? (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a} className="flex items-center gap-2 rounded-lg bg-warning/15 px-3 py-2 text-sm">
                <AlertTriangle className="size-4 shrink-0" aria-hidden /> {a}
              </li>
            ))}
          </ul>
        ) : null}
        <dl className="divide-y rounded-xl border text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-2 px-4 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modalidades y etiquetas</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientAdminForm clientId={c.id} modalities={c.modalities} tags={c.tags} />
        </CardContent>
      </Card>
    </div>
  );
}
