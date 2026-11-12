import { formatDuration } from "@/domain/training/time";
import { formatDate } from "@/features/clients/ui";

export type LogWithSets = {
  id: string;
  title: string | null;
  started_at: string;
  completed_at: string | null;
  total_time_s: number | null;
  session_rpe: number | null;
  feeling: number | null;
  comment: string | null;
  set_logs: {
    id: string;
    set_index: number;
    reps: number | null;
    load_kg: number | null;
    rpe: number | null;
    duration_s: number | null;
    distance_m: number | null;
    station_key: string | null;
    exercises: { name: string } | null;
    session_items: { name: string | null } | null;
  }[];
};

const FEELING = ["", "😫", "😕", "😐", "🙂", "🔥"];

/** Historial de entrenos con sus series (lo usan el panel y el cliente). */
export function LogsList({ logs }: { logs: LogWithSets[] }) {
  if (!logs.length) return <p className="text-sm text-muted-foreground">Aún no hay entrenos registrados.</p>;
  return (
    <ul className="space-y-3">
      {logs.map((l) => {
        const byExercise = new Map<string, typeof l.set_logs>();
        for (const s of [...l.set_logs].sort((a, b) => a.set_index - b.set_index)) {
          const name = s.exercises?.name ?? s.session_items?.name ?? s.station_key ?? "Ejercicio";
          byExercise.set(name, [...(byExercise.get(name) ?? []), s]);
        }
        return (
          <li key={l.id} className="rounded-xl border p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{l.title ?? "Entreno libre"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(l.started_at, true)}
                {l.total_time_s ? ` · ${formatDuration(l.total_time_s)}` : ""}
                {l.session_rpe != null ? ` · RPE ${l.session_rpe}` : ""}
                {l.feeling ? ` · ${FEELING[l.feeling]}` : ""}
              </p>
            </div>
            <ul className="mt-2 space-y-0.5">
              {[...byExercise.entries()].map(([name, sets]) => (
                <li key={name}>
                  <span className="font-medium">{name}:</span>{" "}
                  <span className="text-muted-foreground">
                    {sets
                      .map((s) =>
                        [
                          s.reps != null && s.load_kg != null
                            ? `${s.reps}×${s.load_kg}kg`
                            : s.reps != null
                              ? `${s.reps} reps`
                              : null,
                          s.distance_m ? `${s.distance_m} m` : null,
                          s.duration_s ? formatDuration(s.duration_s) : null,
                          s.rpe != null ? `@${s.rpe}` : null,
                        ]
                          .filter(Boolean)
                          .join(" "),
                      )
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
            {l.comment ? <p className="mt-2 italic">«{l.comment}»</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export const LOG_SELECT = `id, title, started_at, completed_at, total_time_s, session_rpe, feeling, comment,
  set_logs(id, set_index, reps, load_kg, rpe, duration_s, distance_m, station_key, exercises(name), session_items(name))`;
