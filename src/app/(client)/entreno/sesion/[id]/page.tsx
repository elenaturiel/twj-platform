import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { getPreviousSets, getSessionWithContext } from "@/features/training/queries";
import { WorkoutPlayer } from "@/features/training/ui/workout-player";

export const metadata: Metadata = { title: "Entrenando" };

export default async function SessionPage({ params }: PageProps<"/entreno/sesion/[id]">) {
  const ctx = await requireClientWithAccess();
  const { id } = await params;
  const session = await getSessionWithContext(id);
  if (!session || session.client_id !== ctx.client.id) notFound();
  const exerciseIds = [
    ...new Set(session.session_parts.flatMap((p) => p.session_items.map((i) => i.exercise_id).filter(Boolean))),
  ] as string[];
  const previous = await getPreviousSets(ctx.client.id, exerciseIds);

  return (
    <div className="space-y-2">
      <Link href="/entreno" className="text-sm text-muted-foreground hover:underline">
        ← {session.workout_weeks?.workout_blocks?.name ?? "Entreno"} · Semana{" "}
        {(session.workout_weeks?.week_index ?? 0) + 1}
      </Link>
      <WorkoutPlayer
        sessionId={session.id}
        title={session.title}
        notes={session.notes}
        parts={session.session_parts}
        previous={previous}
      />
    </div>
  );
}
