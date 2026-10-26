import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Panel" };

function monthStart(today: string) {
  return `${today.slice(0, 7)}-01`;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function PanelHome() {
  const viewer = await requireStaff();
  const t = await getTranslations("panel.dashboard");
  const te = await getTranslations("empty");
  const supabase = await createClient();
  const today = todayInMadrid();
  const start = monthStart(today);

  const [active, newThisMonth, churned, pending, renewals, revenue, changes] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("clients").select("id", { count: "exact", head: true }).gte("started_at", start),
    supabase.from("clients").select("id", { count: "exact", head: true }).gte("cancelled_at", start),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["past_due", "pending_payment"]),
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("current_period_end", today)
      .lte("current_period_end", addDays(today, 7)),
    supabase.from("payments").select("amount_cents").eq("status", "paid").gte("paid_at", start),
    supabase
      .from("profile_changes")
      .select("id, field, created_at, clients(profiles(full_name))")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const revenueCents = (revenue.data ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
  const kpis = [
    { label: t("activeClients"), value: active.count ?? 0 },
    { label: t("newThisMonth"), value: newThisMonth.count ?? 0 },
    { label: t("churnThisMonth"), value: churned.count ?? 0 },
    { label: t("revenueThisMonth"), value: formatEuros(revenueCents) },
    { label: t("pendingPayments"), value: pending.count ?? 0 },
    { label: t("upcomingRenewals"), value: renewals.count ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-extrabold">{t("title", { name: viewer.fullName.split(" ")[0] || "" })}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{k.label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 text-2xl font-bold tabular-nums">{k.value}</CardContent>
          </Card>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("recentChanges")}</h2>
        {changes.data && changes.data.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {changes.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span>
                  <strong>{c.clients?.profiles?.full_name ?? "Cliente"}</strong> cambió <code>{c.field}</code>
                </span>
                <time className="text-xs text-muted-foreground" dateTime={c.created_at}>
                  {new Date(c.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={te("changes")} />
        )}
      </section>
    </div>
  );
}
