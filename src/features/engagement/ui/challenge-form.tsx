"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RULE_LABELS, type ChallengeRule } from "@/domain/engagement/engagement";
import { saveChallenge } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Initial = {
  id?: string;
  title: string;
  description: string | null;
  starts_on: string;
  ends_on: string;
  rule: ChallengeRule;
  badge_key: string | null;
  plan_keys: string[];
  is_active: boolean;
};

export function ChallengeForm({
  initial,
  badges,
  plans,
  metrics,
  onDone,
}: {
  initial?: Initial;
  badges: { key: string; name: string }[];
  plans: { key: string; name: string }[];
  metrics: { key: string; name: string }[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = useState<Initial>(
    initial ?? {
      title: "",
      description: "",
      starts_on: "",
      ends_on: "",
      rule: { type: "workouts_count", target: 12 },
      badge_key: "challenge_done",
      plan_keys: [],
      is_active: true,
    },
  );
  const [pending, start] = useTransition();
  const metric = v.rule.type === "metric_total" ? v.rule.metric : (metrics[0]?.key ?? "steps");
  const setRule = (type: ChallengeRule["type"], target = v.rule.target) =>
    setV({ ...v, rule: type === "metric_total" ? { type, target, metric } : ({ type, target } as ChallengeRule) });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveChallenge({ ...v, description: v.description ?? "", badge_key: v.badge_key ?? "" });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Reto guardado");
          onDone?.();
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="ch-title">Título</Label>
        <Input
          id="ch-title"
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
          required
          placeholder="Noviembre sin fallar"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ch-desc">Descripción</Label>
        <Textarea
          id="ch-desc"
          rows={2}
          value={v.description ?? ""}
          onChange={(e) => setV({ ...v, description: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="ch-from">Empieza</Label>
          <Input
            id="ch-from"
            type="date"
            value={v.starts_on}
            onChange={(e) => setV({ ...v, starts_on: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ch-to">Acaba</Label>
          <Input
            id="ch-to"
            type="date"
            value={v.ends_on}
            onChange={(e) => setV({ ...v, ends_on: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="ch-type">Qué cuenta</Label>
          <select
            id="ch-type"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={v.rule.type}
            onChange={(e) => setRule(e.target.value as ChallengeRule["type"])}
          >
            {Object.entries(RULE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ch-target">Objetivo</Label>
          <Input
            id="ch-target"
            type="number"
            min={1}
            value={v.rule.target}
            onChange={(e) => setRule(v.rule.type, Number(e.target.value))}
            required
          />
        </div>
      </div>
      {v.rule.type === "metric_total" ? (
        <div className="space-y-1">
          <Label htmlFor="ch-metric">Métrica</Label>
          <select
            id="ch-metric"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={metric}
            onChange={(e) =>
              setV({ ...v, rule: { type: "metric_total", target: v.rule.target, metric: e.target.value } })
            }
          >
            {metrics.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="ch-badge">Medalla al completarlo</Label>
        <select
          id="ch-badge"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={v.badge_key ?? ""}
          onChange={(e) => setV({ ...v, badge_key: e.target.value || null })}
        >
          {badges.map((b) => (
            <option key={b.key} value={b.key}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">Para qué planes (ninguno = todos)</legend>
        <div className="flex flex-wrap gap-x-4">
          {plans.map((p) => (
            <label key={p.key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={v.plan_keys.includes(p.key)}
                onChange={() =>
                  setV({
                    ...v,
                    plan_keys: v.plan_keys.includes(p.key)
                      ? v.plan_keys.filter((k) => k !== p.key)
                      : [...v.plan_keys, p.key],
                  })
                }
              />
              {p.name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={v.is_active} onCheckedChange={(c) => setV({ ...v, is_active: c })} /> Visible para los clientes
      </label>
      <Button type="submit" disabled={pending}>
        Guardar reto
      </Button>
    </form>
  );
}
