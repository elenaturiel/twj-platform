import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { parseRule } from "@/domain/engagement/engagement";
import { getChallengesForClient } from "@/features/engagement/queries";
import { ChallengeCard, type ChallengeView } from "@/features/engagement/ui/challenge-card";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Retos" };

export default async function ChallengesPage() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const [list, { data: metrics }] = await Promise.all([
    getChallengesForClient(ctx.client.id),
    supabase.from("metric_definitions").select("key, name"),
  ]);
  const metricName = new Map((metrics ?? []).map((m) => [m.key, m.name]));
  const views: ChallengeView[] = [];
  for (const c of list) {
    const rule = parseRule(c.rule);
    if (!rule) continue;
    const { data: board } = c.me ? await supabase.rpc("challenge_leaderboard", { p_challenge: c.id }) : { data: [] };
    views.push({
      ...c,
      rule,
      me: c.me ? { progress: Number(c.me.progress), completed_at: c.me.completed_at } : null,
      leaderboard: board ?? [],
      metricLabel: rule.type === "metric_total" ? (metricName.get(rule.metric) ?? null) : null,
    });
  }
  const active = views.filter((v) => v.open);
  const past = views.filter((v) => !v.open && v.me);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Retos</h1>
      {active.length ? (
        active.map((c) => <ChallengeCard key={c.id} c={c} />)
      ) : (
        <EmptyState icon={Trophy} title="Ahora mismo no hay retos abiertos. Jaime los anuncia por aquí." />
      )}
      {past.length ? (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">Anteriores</h2>
          {past.map((c) => (
            <ChallengeCard key={c.id} c={c} />
          ))}
        </section>
      ) : null}
    </div>
  );
}
