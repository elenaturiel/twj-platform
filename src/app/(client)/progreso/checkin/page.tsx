import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { getActiveMetrics, type CheckinQuestion } from "@/features/tracking/queries";
import { hasPhotoConsent } from "@/features/tracking/client-actions";
import { CheckinForm } from "@/features/tracking/ui/checkin-form";
import { PhotoUploader } from "@/features/tracking/ui/photos";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Check-in" };

export default async function CheckinPage() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const { data: checkin } = await supabase
    .from("checkins")
    .select("id, due_on, checkin_templates(name, questions, include_metrics, include_photos)")
    .eq("client_id", ctx.client.id)
    .in("status", ["pending", "missed"])
    .order("due_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!checkin) {
    return (
      <div className="space-y-4">
        <Link href="/progreso" className="text-sm text-muted-foreground hover:underline">
          ← Progreso
        </Link>
        <EmptyState icon={ClipboardCheck} title="No tienes check-ins pendientes. Al día, como debe ser." />
      </div>
    );
  }
  const tpl = checkin.checkin_templates;
  const [metrics, consent] = await Promise.all([
    tpl?.include_metrics ? getActiveMetrics(ctx.client.id) : Promise.resolve([]),
    hasPhotoConsent(),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/progreso" className="text-sm text-muted-foreground hover:underline">
        ← Progreso
      </Link>
      <div>
        <h1 className="text-3xl font-extrabold">{tpl?.name ?? "Check-in"}</h1>
        <p className="text-sm text-muted-foreground">
          Del {new Date(`${checkin.due_on}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
        </p>
      </div>
      {tpl?.include_photos ? (
        <section className="space-y-2 rounded-xl border p-3">
          <h2 className="text-sm font-medium">Fotos (opcional)</h2>
          <PhotoUploader clientId={ctx.client.id} today={todayInMadrid()} consent={consent} checkinId={checkin.id} />
        </section>
      ) : null}
      <CheckinForm
        checkinId={checkin.id}
        questions={(tpl?.questions ?? []) as CheckinQuestion[]}
        metrics={metrics
          .filter((m) => m.type !== "photo")
          .map((m) => ({ id: m.id, name: m.name, unit: m.unit, type: m.type }))}
      />
    </div>
  );
}
