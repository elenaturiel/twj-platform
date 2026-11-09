import "server-only";
import { addDays } from "@/domain/billing/renewal";
import {
  churnRate,
  ltv,
  mrr,
  mrrByPlan,
  revenueByMonth,
  type PaymentRow,
  type SubRow,
} from "@/domain/business/metrics";
import { todayInMadrid } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function getBusinessOverview() {
  const supabase = await createClient();
  const today = todayInMadrid();
  const [{ data: subs }, { data: payments }, { data: clients }, { data: plans }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("client_id, status, billing_interval, amount_cents, started_at, ended_at, plans(key)"),
    supabase
      .from("payments")
      .select("amount_cents, paid_at, status, kind")
      .gte("paid_at", `${addDays(today, -400)}T00:00:00Z`),
    supabase.from("clients").select("id, status, started_at, cancelled_at, created_at"),
    supabase.from("plans").select("key, name, sort_order").order("sort_order"),
  ]);
  const rows: SubRow[] = (subs ?? []).map((s) => ({
    clientId: s.client_id,
    planKey: s.plans?.key ?? "?",
    status: s.status,
    interval: s.billing_interval as "month" | "year",
    amountCents: s.amount_cents,
    startedAt: s.started_at?.slice(0, 10) ?? null,
    endedAt: s.ended_at?.slice(0, 10) ?? null,
  }));
  const pays: PaymentRow[] = (payments ?? []).map((p) => ({
    amountCents: p.amount_cents,
    paidAt: p.paid_at,
    status: p.status,
    kind: p.kind,
  }));
  const active = (clients ?? []).filter((c) => c.status === "active" || c.status === "past_due").length;
  const total = mrr(rows);
  const churn30 = churnRate(rows, addDays(today, -30), today);
  const arpa = active ? Math.round(total / active) : 0;
  const thisMonth = today.slice(0, 7);
  const monthPays = pays.filter((p) => p.status === "paid" && p.paidAt?.startsWith(thisMonth));
  const byPlan = mrrByPlan(rows);
  return {
    today,
    active,
    pastDue: (clients ?? []).filter((c) => c.status === "past_due").length,
    newThisMonth: (clients ?? []).filter((c) => c.started_at?.startsWith(thisMonth)).length,
    cancelledThisMonth: (clients ?? []).filter((c) => c.cancelled_at?.startsWith(thisMonth)).length,
    mrr: total,
    arr: total * 12,
    arpa,
    churn30,
    ltv: ltv(arpa, churn30),
    collectedThisMonth: monthPays.reduce((t, p) => t + p.amountCents, 0),
    extrasThisMonth: monthPays.filter((p) => p.kind === "extra_session").reduce((t, p) => t + p.amountCents, 0),
    revenue: revenueByMonth(pays, today, 12),
    byPlan: (plans ?? []).map((p) => ({
      key: p.key,
      name: p.name,
      cents: byPlan[p.key] ?? 0,
      clients: rows.filter((r) => r.planKey === p.key && (r.status === "active" || r.status === "past_due")).length,
    })),
  };
}
