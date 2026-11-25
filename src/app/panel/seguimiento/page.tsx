import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckinTemplateEditor, CustomFieldsAdmin, MetricCatalog } from "@/features/tracking/ui/tracking-admin";

export const metadata: Metadata = { title: "Seguimiento" };

export default async function TrackingAdminPage() {
  await requireScope("clients");
  const supabase = await createClient();
  const [{ data: defs }, { data: tpl }, { data: fields }] = await Promise.all([
    supabase
      .from("metric_definitions")
      .select("id, name, type, unit, suggested_frequency, is_active, is_system")
      .order("sort_order"),
    supabase
      .from("checkin_templates")
      .select("id, name, questions, include_metrics, include_photos")
      .eq("is_default", true)
      .maybeSingle(),
    supabase.from("custom_fields").select("id, label, type, options, client_editable, is_active").order("sort_order"),
  ]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-extrabold">Seguimiento</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          {tpl ? (
            <CheckinTemplateEditor template={tpl as never} />
          ) : (
            <p className="text-sm text-muted-foreground">No hay plantilla de check-in.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo de métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Todas están ocultas para los clientes hasta que las actives en su ficha (pestaña Progreso).
          </p>
          <MetricCatalog defs={defs ?? []} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos personalizados de la ficha</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomFieldsAdmin fields={fields ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
