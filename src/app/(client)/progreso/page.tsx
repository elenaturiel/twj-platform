import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ClipboardCheck, LineChart } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { getActiveMetrics } from "@/features/tracking/queries";
import { getTrainingAdherence } from "@/features/training/queries";
import { MetricCard } from "@/features/tracking/ui/metric-card";
import { EmptyState } from "@/components/twj/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "Progreso" };

export default async function ProgressPage() {
  const ctx = await requireClientWithAccess();
  const today = todayInMadrid();
  const supabase = await createClient();
  const [metrics, adherence, { data: pending }] = await Promise.all([
    getActiveMetrics(ctx.client.id),
    getTrainingAdherence(ctx.client.id, today),
    supabase
      .from("checkins")
      .select("id, due_on")
      .eq("client_id", ctx.client.id)
      .eq("status", "pending")
      .order("due_on")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Progreso</h1>

      {pending ? (
        <Link
          href="/progreso/checkin"
          className="flex items-center gap-3 rounded-2xl bg-accent p-4 text-accent-foreground"
        >
          <ClipboardCheck className="size-6 shrink-0" aria-hidden />
          <span className="flex-1">
            <span className="font-bold">Te toca el check-in</span>
            <span className="block text-sm opacity-90">3 minutos. Jaime lo usa para ajustar tu plan.</span>
          </span>
        </Link>
      ) : null}

      {adherence.percent != null ? (
        <section className="space-y-2 rounded-2xl border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Adherencia a los entrenos</h2>
            <span className="text-2xl font-extrabold tabular-nums">{adherence.percent} %</span>
          </div>
          <Progress value={adherence.percent} aria-label="Adherencia a los entrenos" />
          <p className="text-xs text-muted-foreground">
            {adherence.done} de {adherence.planned} sesiones planificadas hasta hoy.
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link href="/progreso/fotos">
            <Camera className="size-4" /> Fotos
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/progreso/checkins">
            <ClipboardCheck className="size-4" /> Check-ins
          </Link>
        </Button>
      </div>

      {metrics.filter((m) => m.type !== "photo").length ? (
        <div className="space-y-3">
          {metrics
            .filter((m) => m.type !== "photo")
            .map((m) => (
              <MetricCard key={m.id} metric={m} today={today} editable />
            ))}
        </div>
      ) : (
        <EmptyState
          icon={LineChart}
          title="Jaime activará aquí las métricas que vais a seguir (peso, medidas, pasos…). Sin obsesionarse, que esto va de mejorar."
        />
      )}
    </div>
  );
}
