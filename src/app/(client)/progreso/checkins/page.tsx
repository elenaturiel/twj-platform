import type { Metadata } from "next";
import Link from "next/link";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { getCheckins, signedVoiceUrl } from "@/features/tracking/queries";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Mis check-ins" };

const STATUS: Record<string, string> = {
  pending: "Pendiente",
  submitted: "Enviado",
  reviewed: "Revisado",
  missed: "Sin hacer",
};

export default async function CheckinsHistory() {
  const ctx = await requireClientWithAccess();
  const checkins = await getCheckins(ctx.client.id);
  const voices = await Promise.all(checkins.map((c) => signedVoiceUrl(c.staff_voice_path)));
  return (
    <div className="space-y-4">
      <Link href="/progreso" className="text-sm text-muted-foreground hover:underline">
        ← Progreso
      </Link>
      <h1 className="text-3xl font-extrabold">Mis check-ins</h1>
      {checkins.length ? (
        <ul className="space-y-3">
          {checkins.map((c, i) => (
            <li key={c.id} className="space-y-2 rounded-2xl border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {new Date(`${c.due_on}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                </span>
                <Badge variant={c.status === "reviewed" ? "default" : "outline"}>{STATUS[c.status]}</Badge>
              </div>
              {c.status === "pending" || c.status === "missed" ? (
                <Link href="/progreso/checkin" className="font-medium text-accent underline">
                  Hacerlo ahora
                </Link>
              ) : null}
              {c.checkin_answers.length ? (
                <dl className="space-y-1">
                  {c.checkin_answers.map((a) => (
                    <div key={a.question_key}>
                      <dt className="text-xs text-muted-foreground">{a.question_label}</dt>
                      <dd>{a.value === true ? "Sí" : a.value === false ? "No" : String(a.value ?? "—")}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {c.staff_reply || voices[i] ? (
                <div className="space-y-2 rounded-xl bg-secondary p-3">
                  <p className="text-xs font-semibold">Jaime:</p>
                  {c.staff_reply ? <p className="whitespace-pre-line">{c.staff_reply}</p> : null}
                  {voices[i] ? <audio controls src={voices[i]!} className="w-full" /> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Todavía no hay check-ins. El primero llega solo, no hace falta buscarlo." />
      )}
    </div>
  );
}
