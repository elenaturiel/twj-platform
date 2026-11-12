import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Dumbbell, History, Trophy } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { todayInMadrid } from "@/lib/dates";
import { getTrainingOverview } from "@/features/training/queries";
import { DAY_NAMES, sessionDate } from "@/domain/training/week";
import { MODALITY_LABELS } from "@/domain/training/prescription";
import { EmptyState } from "@/components/twj/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Entreno" };

export default async function TrainingPage({ searchParams }: PageProps<"/entreno">) {
  const ctx = await requireClientWithAccess();
  const today = todayInMadrid();
  const sp = await searchParams;
  const { block, weekIndex, done } = await getTrainingOverview(ctx.client.id, today);

  if (!block) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Entreno</h1>
        <EmptyState
          icon={Dumbbell}
          title="Jaime está preparando tu plan. Los abdominales no se hacen solos, pero casi."
        />
        <Links />
      </div>
    );
  }

  const selected = typeof sp.semana === "string" ? Number(sp.semana) - 1 : (weekIndex ?? 0);
  const week = block.workout_weeks.find((w) => w.week_index === selected) ?? block.workout_weeks[0];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{block.goal ?? "Tu bloque actual"}</p>
        <h1 className="text-3xl font-extrabold">{block.name}</h1>
      </div>

      <nav className="-mx-4 overflow-x-auto px-4" aria-label="Semanas">
        <ul className="flex gap-2">
          {block.workout_weeks.map((w) => (
            <li key={w.id}>
              <Link
                href={`/entreno?semana=${w.week_index + 1}`}
                aria-current={w.week_index === week?.week_index ? "page" : undefined}
                className={cn(
                  "flex min-w-14 flex-col items-center rounded-xl border px-3 py-1.5 text-xs",
                  w.week_index === week?.week_index && "border-primary bg-primary text-primary-foreground",
                )}
              >
                <span className="font-semibold">S{w.week_index + 1}</span>
                <span>{w.week_index === weekIndex ? "Ahora" : w.is_deload ? "Descarga" : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {week ? (
        <ul className="space-y-2">
          {week.workout_sessions.map((s) => {
            const date = sessionDate(block.starts_on, week.week_index, s.day_index);
            const isToday = date === today;
            const isDone = done.has(s.id);
            const modalities = [...new Set(s.session_parts.map((p) => MODALITY_LABELS[p.modality]))];
            return (
              <li key={s.id}>
                <Link
                  href={`/entreno/sesion/${s.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 hover:bg-muted/50",
                    isToday && "border-accent ring-2 ring-accent/30",
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-6 shrink-0 text-success" aria-label="Hecha" />
                  ) : (
                    <Dumbbell className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className="flex-1">
                    <span className="font-semibold">{s.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.day_index != null ? DAY_NAMES[s.day_index] : "Cuando puedas"}
                      {date
                        ? ` · ${new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
                        : ""}
                      {modalities.length ? ` · ${modalities.join(" + ")}` : ""}
                    </span>
                  </span>
                  {isToday ? <Badge>Hoy</Badge> : null}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
          {!week.workout_sessions.length ? (
            <EmptyState title="Semana sin sesiones. Descansa con la conciencia tranquila." />
          ) : null}
        </ul>
      ) : null}
      {week?.notes ? <p className="text-sm text-muted-foreground">{week.notes}</p> : null}
      <Links />
    </div>
  );
}

function Links() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="outline">
        <Link href="/entreno/historial">
          <History className="size-4" /> Historial
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/entreno/records">
          <Trophy className="size-4" /> Récords
        </Link>
      </Button>
    </div>
  );
}
