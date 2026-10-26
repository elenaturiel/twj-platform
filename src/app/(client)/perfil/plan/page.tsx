import type { Metadata } from "next";
import { Check, Lock } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/money";
import { openBillingPortal } from "@/features/billing/client-actions";
import { StudentCardUpload } from "@/features/onboarding/student-card-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Mi plan" };

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  past_due: "Pago pendiente",
  paused: "En pausa",
  cancelled: "Cancelado",
  pending_payment: "Pendiente de pago",
};

export default async function MyPlanPage({ searchParams }: PageProps<"/perfil/plan">) {
  const ctx = await requireClientWithAccess();
  const sp = await searchParams;
  const supabase = await createClient();

  const [
    { data: sub },
    { data: payments },
    { data: features },
    { data: student },
    { data: squadSize },
    { data: squad },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "billing_mode, billing_interval, status, amount_cents, list_price_cents, discount_breakdown, current_period_end, cancel_at_period_end",
      )
      .eq("client_id", ctx.client.id)
      .in("status", ["active", "past_due", "paused"])
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount_cents, paid_at, method, period_start, period_end, status")
      .eq("client_id", ctx.client.id)
      .order("paid_at", { ascending: false })
      .limit(12),
    supabase
      .from("public_plan_features")
      .select("feature_key, feature_name, enabled, label, sort_order")
      .eq("plan_id", ctx.client.planId ?? "")
      .order("sort_order"),
    supabase
      .from("discount_redemptions")
      .select("status, snapshot, discounts!inner(kind)")
      .eq("client_id", ctx.client.id)
      .eq("discounts.kind", "student")
      .in("status", ["applied", "reserved"])
      .maybeSingle(),
    supabase.rpc("my_squad_size"),
    supabase.from("squads").select("code").maybeSingle(),
  ]);

  const { data: verification } = student
    ? await supabase
        .from("student_verifications")
        .select("status")
        .eq("client_id", ctx.client.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  const breakdown = (sub?.discount_breakdown ?? []) as { label: string; amount_cents: number }[];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Mi plan</h1>
      {sp.portal === "no" ? (
        <p className="text-sm text-muted-foreground">La gestión del pago con tarjeta aún no está disponible.</p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-2xl uppercase">{ctx.client.planName}</CardTitle>
          {sub ? (
            <Badge variant={sub.status === "active" ? "secondary" : "destructive"}>{STATUS_LABEL[sub.status]}</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sub ? (
            <>
              <p className="text-2xl font-extrabold tabular-nums">
                {formatEuros(sub.amount_cents)}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  /{sub.billing_interval === "year" ? "año" : "mes"}
                </span>
              </p>
              {breakdown.map((b) => (
                <p key={b.label} className="text-success">
                  {b.label}: −{formatEuros(b.amount_cents)}
                </p>
              ))}
              {sub.current_period_end ? (
                <p className="text-muted-foreground">
                  {sub.cancel_at_period_end ? "Termina el" : "Próxima renovación:"} {sub.current_period_end}
                </p>
              ) : null}
              <p className="text-muted-foreground">
                Cobro: {sub.billing_mode === "stripe" ? "tarjeta (automático)" : "manual (Bizum/transferencia)"}
              </p>
              {sub.billing_mode === "stripe" ? (
                <form action={openBillingPortal}>
                  <Button type="submit" variant="outline" size="sm">
                    Cambiar tarjeta, ver facturas o cancelar
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>

      {student && verification?.status !== "approved" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carné universitario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {verification?.status === "pending" ? (
              <p>Tu carné está pendiente de revisión.</p>
            ) : (
              <>
                <p className="text-muted-foreground">Sube una foto de tu carné para mantener el −10 %.</p>
                <StudentCardUpload clientId={ctx.client.id} />
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {squad ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu squad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              Código: <code className="rounded bg-muted px-1.5 py-0.5 font-semibold">{squad.code}</code>
            </p>
            <p className="text-muted-foreground">
              Sois {squadSize ?? 1}. Con 3 personas, −15 % para todos; con 4, −25 %.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Qué incluye</h2>
        <ul className="divide-y rounded-xl border text-sm">
          {(features ?? []).map((f) => (
            <li key={f.feature_key} className="flex items-center gap-3 px-4 py-2.5">
              {f.enabled ? (
                <Check className="size-4 text-success" aria-hidden />
              ) : (
                <Lock className="size-4 text-muted-foreground" aria-hidden />
              )}
              <span className={f.enabled ? "" : "text-muted-foreground"}>{f.feature_name}</span>
              {f.label ? <span className="ml-auto text-xs text-muted-foreground">{f.label}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-bold">Pagos</h2>
        <ul className="divide-y rounded-xl border text-sm">
          {(payments ?? []).map((p) => (
            <li key={p.id} className="flex justify-between px-4 py-2.5">
              <span>
                {p.period_start} → {p.period_end}
              </span>
              <span className="tabular-nums">{formatEuros(p.amount_cents)}</span>
            </li>
          ))}
          {!payments?.length ? <li className="px-4 py-3 text-muted-foreground">Sin pagos todavía.</li> : null}
        </ul>
      </section>
    </div>
  );
}
