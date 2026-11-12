import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { getActiveMetrics } from "@/features/tracking/queries";
import { getTrainingAdherence } from "@/features/training/queries";
import { MetricCard } from "@/features/tracking/ui/metric-card";
import { ClientMetricsManager, StaffPhotos, type MetricRow } from "@/features/tracking/ui/staff-tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function ClientProgress({ params }: PageProps<"/panel/clientes/[id]/progreso">) {
  const { id } = await params;
  const supabase = await createClient();
  const today = todayInMadrid();
  const [metrics, adherence, { data: defs }, { data: cms }] = await Promise.all([
    getActiveMetrics(id),
    getTrainingAdherence(id, today),
    supabase
      .from("metric_definitions")
      .select("id, name, unit, suggested_frequency, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("client_metrics")
      .select("metric_id, is_active, frequency, target_value, target_direction")
      .eq("client_id", id),
  ]);
  await supabase.rpc("log_access", { p_entity: "metric_entries", p_entity_id: id, p_client_id: id });
  const rows: MetricRow[] = (defs ?? []).map((d) => {
    const cm = cms?.find((c) => c.metric_id === d.id);
    return {
      id: d.id,
      name: d.name,
      unit: d.unit,
      suggested_frequency: d.suggested_frequency,
      active: Boolean(cm?.is_active),
      frequency: cm?.frequency ?? null,
      target_value: cm?.target_value == null ? null : Number(cm.target_value),
      target_direction: cm?.target_direction ?? null,
    };
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {adherence.percent != null ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adherencia a entrenos: {adherence.percent} %</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Progress value={adherence.percent} aria-label="Adherencia" />
              <p className="text-xs text-muted-foreground">
                {adherence.done} de {adherence.planned} sesiones planificadas hasta hoy.
              </p>
            </CardContent>
          </Card>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          {metrics
            .filter((m) => m.type !== "photo")
            .map((m) => (
              <MetricCard key={m.id} metric={m} today={today} editable={false} />
            ))}
        </div>
        {!metrics.length ? (
          <p className="text-sm text-muted-foreground">No hay métricas activas. Actívalas a la derecha.</p>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fotos de progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffPhotos clientId={id} />
          </CardContent>
        </Card>
      </div>
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">Métricas de este cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            Todas ocultas por defecto. Activa solo las que hayáis pactado.
          </p>
          <ClientMetricsManager clientId={id} metrics={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
