import type { Metadata } from "next";
import { Download } from "lucide-react";
import { requireScope } from "@/lib/auth/dal";
import { formatEuros } from "@/lib/money";
import { getBusinessOverview } from "@/features/business/queries";
import { RevenueChart } from "@/features/business/revenue-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Negocio" };

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function BusinessPage() {
  await requireScope("business");
  const b = await getBusinessOverview();
  const maxPlan = Math.max(1, ...b.byPlan.map((p) => p.cents));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-extrabold">Negocio</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/api/panel/export?tipo=pagos" download>
              <Download className="size-4" /> Pagos (CSV)
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href="/api/panel/export?tipo=clientes" download>
              <Download className="size-4" /> Clientes (CSV)
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="MRR" value={formatEuros(b.mrr)} hint={`ARR ${formatEuros(b.arr)} · IVA incl.`} />
        <Kpi
          label="Clientes activos"
          value={String(b.active)}
          hint={b.pastDue ? `${b.pastDue} con pago pendiente` : "todos al día"}
        />
        <Kpi
          label="Cobrado este mes"
          value={formatEuros(b.collectedThisMonth)}
          hint={b.extrasThisMonth ? `${formatEuros(b.extrasThisMonth)} en sesiones extra` : undefined}
        />
        <Kpi label="Ingreso medio" value={formatEuros(b.arpa)} hint="por cliente y mes" />
        <Kpi label="Altas este mes" value={String(b.newThisMonth)} />
        <Kpi label="Bajas este mes" value={String(b.cancelledThisMonth)} />
        <Kpi
          label="Churn 30 días"
          value={b.churn30 == null ? "–" : `${(b.churn30 * 100).toFixed(1).replace(".", ",")} %`}
          hint="bajas / activos al empezar"
        />
        <Kpi label="LTV estimado" value={b.ltv == null ? "–" : formatEuros(b.ltv)} hint="ingreso medio / churn" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cobrado por mes</CardTitle>
          <CardDescription>Últimos 12 meses, pagos cobrados (Stripe y manuales), IVA incluido.</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={b.revenue} />
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
            <table className="mt-2 w-full">
              <tbody className="divide-y">
                {b.revenue.map((r) => (
                  <tr key={r.month}>
                    <td className="py-1">{r.month}</td>
                    <td className="text-right tabular-nums">{formatEuros(r.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MRR por plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {b.byPlan.map((p) => (
              <li key={p.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {p.name} <span className="font-normal text-muted-foreground">· {p.clients} clientes</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatEuros(p.cents)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-chart-1" style={{ width: `${(p.cents / maxPlan) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Las cuotas anuales cuentan en el MRR repartidas entre 12. El LTV es una estimación con el churn de los últimos
        30 días; con pocos clientes varía mucho.
      </p>
    </div>
  );
}
