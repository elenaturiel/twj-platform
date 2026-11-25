import Link from "next/link";
import { Flame } from "lucide-react";

/** Racha semanal: semanas seguidas cumpliendo ≥ 80 % del plan. */
export function StreakCard({
  weeks,
  best,
  done,
  planned,
}: {
  weeks: number;
  best: number;
  done: number;
  planned: number;
}) {
  const need = Math.max(0, Math.ceil(planned * 0.8) - done);
  return (
    <Link href="/medallas" className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:bg-muted/50">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15">
        <Flame className="size-6 text-accent" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold">
          {weeks} {weeks === 1 ? "semana" : "semanas"} de racha
        </span>
        <span className="block text-xs text-muted-foreground">
          {planned
            ? need
              ? `Esta semana: ${done}/${planned}. Te ${need === 1 ? "falta 1 sesión" : `faltan ${need} sesiones`} para sumarla.`
              : `Esta semana: ${done}/${planned}. ¡Semana sumada!`
            : "Esta semana no tienes sesiones planificadas."}
          {best > weeks ? ` Tu récord: ${best}.` : ""}
        </span>
      </span>
    </Link>
  );
}
