import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { addDays } from "@/domain/billing/renewal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/twj/empty-state";
import { FIELD_LABELS } from "@/features/onboarding/labels";

export const metadata: Metadata = { title: "Panel" };

function monthStart(today: string) {
  return `${today.slice(0, 7)}-01`;
}

export default async function PanelHome() {
  const viewer = await requireStaff();
  const t = await getTranslations("panel.dashboard");
  const te = await getTranslations("empty");
  const supabase = await createClient();
  const today = todayInMadrid();
  const start = monthStart(today);

  const weekAgo = addDays(today, -7);
  const [active, newThisMonth, churned, pending, renewals, revenue, changes, inactive] = await Promise.all([
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
    supabase
      .from("clients")
      .select("id, last_activity_at, profiles(full_name)")
      .eq("status", "active")
      .or(`last_activity_at.is.null,last_activity_at.lt.${weekAgo}`)
      .order("last_activity_at", { ascending: true, nullsFirst: true })
      .limit(10),
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
        <h2 className="text-xl font-bold">{t("inactiveClients")}</h2>
        {inactive.data && inactive.data.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {inactive.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <Link href={`/panel/clientes/${c.id}`} className="font-medium hover:underline">
                  {c.profiles?.full_name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {c.last_activity_at
                    ? `Última vez: ${new Date(c.last_activity_at).toLocaleDateString("es-ES")}`
                    : "Sin actividad registrada"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Todo el mundo está dándolo todo." />
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t("recentChanges")}</h2>
        {changes.data && changes.data.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {changes.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span>
                  <strong>{c.clients?.profiles?.full_name ?? "Cliente"}</strong> cambió{" "}
                  {FIELD_LABELS[c.field] ?? c.field}
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
