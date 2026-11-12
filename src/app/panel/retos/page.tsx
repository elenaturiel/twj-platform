import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { parseRule, RULE_LABELS } from "@/domain/engagement/engagement";
import { ChallengeForm } from "@/features/engagement/ui/challenge-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Retos" };

export default async function StaffChallenges() {
  await requireScope("clients");
  const supabase = await createClient();
  const [{ data: challenges }, { data: badges }, { data: plans }, { data: metrics }, { data: streaks }] =
    await Promise.all([
      supabase
        .from("challenges")
        .select("*, challenge_participants(client_id, progress, completed_at)")
        .order("starts_on", { ascending: false }),
      supabase.from("badges").select("key, name").eq("is_active", true).order("sort_order"),
      supabase.from("plans").select("key, name").order("sort_order"),
      supabase.from("metric_definitions").select("key, name").order("name"),
      supabase
        .from("client_streaks")
        .select("training_weeks, clients(profiles(full_name))")
        .order("training_weeks", { ascending: false })
        .limit(10),
    ]);
  const opts = { badges: badges ?? [], plans: plans ?? [], metrics: metrics ?? [] };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-3xl font-extrabold">Retos y rachas</h1>
      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          {(challenges ?? []).map((c) => {
            const rule = parseRule(c.rule);
            const parts = c.challenge_participants ?? [];
            const done = parts.filter((p) => p.completed_at).length;
            return (
              <Card key={c.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {c.title} {!c.is_active ? <Badge variant="outline">Oculto</Badge> : null}
                  </CardTitle>
                  <CardDescription>
                    {c.starts_on} → {c.ends_on} ·{" "}
                    {rule ? `${RULE_LABELS[rule.type]}: ${rule.target}` : "regla no válida"} · {parts.length} apuntados
                    · {done} lo han superado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">Editar</summary>
                    <div className="pt-3">{rule ? <ChallengeForm initial={{ ...c, rule }} {...opts} /> : null}</div>
                  </details>
                </CardContent>
              </Card>
            );
          })}
          {!challenges?.length ? (
            <p className="text-sm text-muted-foreground">Aún no hay retos. Crea el primero.</p>
          ) : null}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nuevo reto</CardTitle>
            </CardHeader>
            <CardContent>
              <ChallengeForm {...opts} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Mejores rachas</CardTitle>
              <CardDescription>Semanas seguidas con ≥ 80 % del plan hecho.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1 text-sm">
                {(streaks ?? []).map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{s.clients?.profiles?.full_name}</span>
                    <span className="font-semibold tabular-nums">{s.training_weeks}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
