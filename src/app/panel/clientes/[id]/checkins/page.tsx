import { createClient } from "@/lib/supabase/server";
import { getCheckins, signedVoiceUrl } from "@/features/tracking/queries";
import { CheckinReview } from "@/features/tracking/ui/checkin-review";
import { CheckinScheduleForm } from "@/features/tracking/ui/staff-tracking";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/features/clients/ui";

const STATUS: Record<string, string> = {
  pending: "Pendiente",
  submitted: "Por revisar",
  reviewed: "Revisado",
  missed: "Sin hacer",
};

export default async function ClientCheckins({ params }: PageProps<"/panel/clientes/[id]/checkins">) {
  const { id } = await params;
  const supabase = await createClient();
  const [checkins, { data: client }, { data: feature }] = await Promise.all([
    getCheckins(id, 30),
    supabase.from("clients").select("checkin_frequency_days, checkin_weekday").eq("id", id).single(),
    supabase.rpc("feature_for_client", { p_client_id: id, p_feature: "checkins" }),
  ]);
  const voices = await Promise.all(checkins.map((c) => signedVoiceUrl(c.staff_voice_path)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendario de check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckinScheduleForm
            clientId={id}
            frequency={client?.checkin_frequency_days ?? null}
            weekday={client?.checkin_weekday ?? null}
            planDefault={feature?.[0]?.limit_value ?? null}
          />
        </CardContent>
      </Card>
      {checkins.map((c, i) => (
        <Card key={c.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Check-in del {formatDate(c.due_on)}</CardTitle>
            <Badge variant={c.status === "submitted" ? "default" : "outline"}>{STATUS[c.status]}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {c.checkin_answers.length ? (
              <dl className="grid gap-2 sm:grid-cols-2">
                {c.checkin_answers.map((a) => (
                  <div key={a.question_key}>
                    <dt className="text-xs text-muted-foreground">{a.question_label}</dt>
                    <dd className="whitespace-pre-line">
                      {a.value === true ? "Sí" : a.value === false ? "No" : String(a.value ?? "—")}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground">Aún sin respuestas.</p>
            )}
            {c.staff_reply || voices[i] ? (
              <div className="rounded-lg bg-secondary p-3">
                {c.staff_reply ? <p className="whitespace-pre-line">{c.staff_reply}</p> : null}
                {voices[i] ? <audio controls src={voices[i]!} className="mt-2 w-full" /> : null}
              </div>
            ) : null}
            {c.status === "submitted" ? <CheckinReview checkinId={c.id} clientId={id} /> : null}
          </CardContent>
        </Card>
      ))}
      {!checkins.length ? <p className="text-sm text-muted-foreground">Sin check-ins todavía.</p> : null}
    </div>
  );
}
