import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingCallForm } from "@/features/clients/staff-forms";
import { formatDate } from "@/features/clients/ui";
import { FIELD_LABELS, formatFieldValue } from "@/features/onboarding/labels";

const INTAKE_FIELDS = [
  "goal",
  "birth_date",
  "injuries",
  "experience",
  "available_days",
  "equipment",
  "equipment_notes",
  "allergens",
  "allergy_notes",
  "food_budget_cents",
  "food_budget_period",
  "class_schedule",
] as const;

export default async function ClientFile({ params }: PageProps<"/panel/clientes/[id]/ficha">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: intake }, { data: health }, { data: changes }, { data: call }, { data: q }] = await Promise.all([
    supabase.from("client_intake").select("*").eq("client_id", id).maybeSingle(),
    supabase
      .from("health_screenings")
      .select("version, answers, has_flags, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profile_changes")
      .select("id, field, old_value, new_value, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("onboarding_calls").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("settings").select("value").eq("key", "health_screening.questions").single(),
  ]);
  // Acceso a datos de salud: queda en la auditoría
  if (health) await supabase.rpc("log_access", { p_entity: "health_screenings", p_entity_id: id, p_client_id: id });
  const questions = (q?.value as { questions?: { key: string; label: string }[] })?.questions ?? [];
  const answers = (health?.answers ?? {}) as Record<string, { answer: boolean }>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ficha de onboarding</CardTitle>
        </CardHeader>
        <CardContent>
          {intake ? (
            <dl className="divide-y text-sm">
              {INTAKE_FIELDS.map((f) => (
                <div key={f} className="grid grid-cols-[160px_1fr] gap-2 py-2">
                  <dt className="text-muted-foreground">{FIELD_LABELS[f]}</dt>
                  <dd className="whitespace-pre-line">{formatFieldValue(f, intake[f])}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState title="Aún no ha rellenado la ficha." />
          )}
          <p className="mt-3 text-xs text-muted-foreground">Campos personalizados: llegan en la Fase 3.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuestionario de salud {health?.has_flags ? "⚠️" : ""}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {health ? (
            <ol className="space-y-2">
              {questions.map((qq, i) => (
                <li key={qq.key} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    {i + 1}. {qq.label}
                  </span>
                  <strong className={answers[qq.key]?.answer ? "text-destructive" : ""}>
                    {answers[qq.key]?.answer ? "Sí" : "No"}
                  </strong>
                </li>
              ))}
              <li className="text-xs text-muted-foreground">
                Respondido el {formatDate(health.created_at, true)} · versión {health.version}
              </li>
            </ol>
          ) : (
            <p className="text-muted-foreground">Sin responder (o sin permiso de datos de salud).</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Llamada de onboarding (solo equipo)</CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingCallForm clientId={id} call={call} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de cambios del cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {changes?.length ? (
            <ul className="divide-y text-sm">
              {changes.map((ch) => (
                <li key={ch.id} className="py-2">
                  <p>
                    <strong>{FIELD_LABELS[ch.field] ?? ch.field}</strong>: {formatFieldValue(ch.field, ch.old_value)} →{" "}
                    {formatFieldValue(ch.field, ch.new_value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(ch.created_at, true)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin cambios desde el onboarding." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
