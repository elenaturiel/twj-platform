import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { addDays } from "@/domain/billing/renewal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { METHOD_LABELS, StatusBadge, formatDate } from "@/features/clients/ui";

export const metadata: Metadata = { title: "Pagos" };

type DueRow = {
  id: string;
  client_id: string;
  status: string;
  billing_mode: string;
  amount_cents: number;
  current_period_end: string | null;
  clients: { profiles: { full_name: string } | null } | null;
  plans: { name: string } | null;
};

function SubTable({ rows }: { rows: DueRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Renovación</TableHead>
          <TableHead className="hidden sm:table-cell">Cobro</TableHead>
          <TableHead className="text-right">Importe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <Link className="hover:underline" href={`/panel/clientes/${s.client_id}/pagos`}>
                {s.clients?.profiles?.full_name}
              </Link>{" "}
              <span className="text-xs text-muted-foreground">{s.plans?.name}</span>
            </TableCell>
            <TableCell>
              {formatDate(s.current_period_end)} {s.status === "past_due" ? <StatusBadge status="past_due" /> : null}
            </TableCell>
            <TableCell className="hidden sm:table-cell">{s.billing_mode === "stripe" ? "Stripe" : "Manual"}</TableCell>
            <TableCell className="text-right tabular-nums">{formatEuros(s.amount_cents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function PaymentsPage() {
  await requireScope("billing");
  const supabase = await createClient();
  const today = todayInMadrid();
  const [{ data: due }, { data: latest }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, client_id, status, billing_mode, amount_cents, current_period_end, grace_until, clients(profiles(full_name)), plans(name)",
      )
      .in("status", ["active", "past_due"])
      .lte("current_period_end", addDays(today, 30))
      .order("current_period_end"),
    supabase
      .from("payments")
      .select("id, client_id, amount_cents, method, paid_at, status, clients(profiles(full_name))")
      .order("paid_at", { ascending: false })
      .limit(30),
  ]);

  const overdue = (due ?? []).filter((s) => s.status === "past_due");
  const upcoming = (due ?? []).filter((s) => s.status === "active");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-3xl font-extrabold">Pagos</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vencidos ({overdue.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length ? (
            <SubTable rows={overdue} />
          ) : (
            <p className="text-sm text-muted-foreground">Ninguno. Así da gusto.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renovaciones en los próximos 30 días ({upcoming.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length ? <SubTable rows={upcoming} /> : <p className="text-sm text-muted-foreground">Ninguna.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos cobros</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(latest ?? []).map((p) => (
              <li key={p.id} className="flex justify-between gap-2 py-2">
                <span>
                  <Link className="hover:underline" href={`/panel/clientes/${p.client_id}/pagos`}>
                    {p.clients?.profiles?.full_name}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(p.paid_at)} · {METHOD_LABELS[p.method]}
                  </span>
                </span>
                <span className="tabular-nums">{formatEuros(p.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
