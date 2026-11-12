"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Trophy } from "lucide-react";
import { progressPct, RULE_LABELS, type ChallengeRule } from "@/domain/engagement/engagement";
import { joinChallenge, leaveChallenge } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export type ChallengeView = {
  id: string;
  title: string;
  description: string | null;
  starts_on: string;
  ends_on: string;
  rule: ChallengeRule;
  me: { progress: number; completed_at: string | null } | null;
  open: boolean;
  upcoming: boolean;
  leaderboard: { first_name: string; progress: number; completed: boolean; is_me: boolean }[];
  metricLabel?: string | null;
};

const fmt = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

export function ChallengeCard({ c }: { c: ChallengeView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showBoard, setShowBoard] = useState(false);
  const progress = Number(c.me?.progress ?? 0);
  const pct = progressPct(progress, c.rule.target);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Error");
      toast.success(msg);
      router.refresh();
    });

  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{c.title}</h3>
          <p className="text-xs text-muted-foreground">
            {fmt(c.starts_on)} – {fmt(c.ends_on)} ·{" "}
            {c.rule.type === "metric_total" && c.metricLabel ? c.metricLabel : RULE_LABELS[c.rule.type]}:{" "}
            {c.rule.target.toLocaleString("es-ES")}
          </p>
        </div>
        {c.me?.completed_at ? (
          <Badge variant="secondary">
            <CheckCircle2 className="size-3" /> Superado
          </Badge>
        ) : c.upcoming ? (
          <Badge variant="outline">Próximamente</Badge>
        ) : null}
      </div>
      {c.description ? <p className="text-sm">{c.description}</p> : null}
      {c.me ? (
        <div className="space-y-1">
          <Progress value={pct} aria-label={`Progreso del reto ${c.title}`} />
          <p className="text-xs text-muted-foreground tabular-nums">
            {progress.toLocaleString("es-ES")} de {c.rule.target.toLocaleString("es-ES")} · {pct} %
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {!c.me && c.open ? (
          <Button size="sm" disabled={pending} onClick={() => run(() => joinChallenge(c.id), "¡Dentro del reto!")}>
            Me apunto
          </Button>
        ) : null}
        {c.me && !c.me.completed_at && c.open ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => leaveChallenge(c.id), "Has salido del reto")}
          >
            Salir
          </Button>
        ) : null}
        {c.me && c.leaderboard.length > 1 ? (
          <Button size="sm" variant="outline" onClick={() => setShowBoard(!showBoard)}>
            {showBoard ? "Ocultar clasificación" : "Clasificación"}
          </Button>
        ) : null}
      </div>
      {showBoard ? (
        <ol className="divide-y rounded-xl border text-sm">
          {c.leaderboard.map((l, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 px-3 py-1.5 ${l.is_me ? "bg-accent/10 font-semibold" : ""}`}
            >
              <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="flex-1">{l.is_me ? "Tú" : l.first_name}</span>
              <span className="tabular-nums">{Number(l.progress).toLocaleString("es-ES")}</span>
              {l.completed ? <CheckCircle2 className="size-4 text-success" aria-label="Superado" /> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}
