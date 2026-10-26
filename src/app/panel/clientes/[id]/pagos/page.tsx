import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ManualPaymentForm, SendCheckoutButton } from "@/features/clients/staff-forms";
import { METHOD_LABELS, StatusBadge, formatDate } from "@/features/clients/ui";

export default async function ClientPayments({ params }: PageProps<"/panel/clientes/[id]/pagos">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: sub }, { data: payments }, { data: redemptions }, { data: credits }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, status, billing_mode, billing_interval, list_price_cents, amount_cents, discount_breakdown, current_period_start, current_period_end, grace_until, cancel_at_period_end, plans(name)",
      )
      .eq("client_id", id)
      .neq("status", "cancelled")
      .maybeSingle(),
    supabase.from("payments").select("*").eq("client_id", id).order("paid_at", { ascending: false }),
    supabase
      .from("discount_redemptions")
      .select("id, status, applied_at, snapshot, discounts(name, kind)")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("session_credits")
      .select("id, credit_type, delta, reason, period_start, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const breakdown = (sub?.discount_breakdown ?? []) as { label: string; amount_cents: number }[];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Suscripción</CardTitle>
          {sub ? <StatusBadge status={sub.status} /> : null}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {sub ? (
            <>
              <p>
                {sub.plans?.name} · {sub.billing_interval === "year" ? "anual" : "mensual"} ·{" "}
                {sub.billing_mode === "stripe" ? "Stripe (automático)" : "Manual"}
              </p>
              <p className="text-2xl font-extrabold tabular-nums">{formatEuros(sub.amount_cents)}</p>
              <p className="text-muted-foreground">Precio de lista: {formatEuros(sub.list_price_cents)}</p>
              {breakdown.map((b) => (
                <p key={b.label} className="text-success">
                  {b.label}: −{formatEuros(b.amount_cents)}
                </p>
              ))}
              <p>
                Periodo: {formatDate(sub.current_period_start)} → {formatDate(sub.current_period_end)}
              </p>
              {sub.grace_until ? <p className="text-destructive">Gracia hasta {formatDate(sub.grace_until)}</p> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                {sub.billing_mode === "manual" && sub.status !== "pending_payment" ? (
                  <SendCheckoutButton clientId={id} label="Pasar a pago automático (Stripe)" />
                ) : null}
                {sub.billing_mode === "stripe" && sub.status === "pending_payment" ? (
                  <SendCheckoutButton clientId={id} label="Reenviar enlace de pago" />
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Sin suscripción activa.</p>
          )}
        </CardContent>
      </Card>

      {sub && (sub.billing_mode === "manual" || sub.status === "pending_payment") ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registrar pago manual</CardTitle>
          </CardHeader>
          <CardContent>
            <ManualPaymentForm
              subscriptionId={sub.id}
              defaultAmountEuros={sub.amount_cents / 100}
              today={todayInMadrid()}
              isFirst={sub.status === "pending_payment"}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Historial de pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paid_at)}</TableCell>
                  <TableCell>
                    {formatDate(p.period_start)} → {formatDate(p.period_end)}
                  </TableCell>
                  <TableCell>
                    {METHOD_LABELS[p.method]}{" "}
                    {p.status !== "paid" ? <Badge variant="destructive">{p.status}</Badge> : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEuros(p.amount_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!payments?.length ? <p className="py-4 text-center text-sm text-muted-foreground">Sin pagos.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Descuentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(redemptions ?? []).map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span>
                  {r.discounts?.name}
                  {(r.snapshot as { pending_verification?: boolean })?.pending_verification ? " · carné pendiente" : ""}
                </span>
                <Badge variant={r.status === "applied" ? "secondary" : "outline"}>{r.status}</Badge>
              </li>
            ))}
            {!redemptions?.length ? <li className="py-2 text-muted-foreground">Ninguno.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Créditos de sesiones</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(credits ?? []).map((c) => (
              <li key={c.id} className="flex justify-between py-2">
                <span>
                  {c.credit_type === "live_training"
                    ? "Entreno en directo"
                    : c.credit_type === "monthly_call"
                      ? "Videollamada mensual"
                      : "Extra"}{" "}
                  · {c.reason}
                  {c.period_start ? ` (${formatDate(c.period_start)})` : ""}
                </span>
                <span className="tabular-nums">{c.delta > 0 ? `+${c.delta}` : c.delta}</span>
              </li>
            ))}
            {!credits?.length ? <li className="py-2 text-muted-foreground">Sin movimientos.</li> : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
