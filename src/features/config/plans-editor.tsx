"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveDiscount, setPlanFeature, updatePlan, type ConfigResult } from "./actions";

function useRun() {
  const [pending, start] = useTransition();
  return {
    pending,
    run: (fn: () => Promise<ConfigResult>, ok = "Guardado") =>
      start(async () => {
        const r = await fn();
        if (r.ok) toast.success(ok);
        else toast.error(r.error);
      }),
  };
}

export type PlanRow = {
  id: string;
  key: string;
  name: string;
  tagline: string | null;
  description: string | null;
  price_cents: number | null;
  is_active: boolean;
  requires_application: boolean;
  highlights: string[];
};

export function PlanCard({ plan, activeClients }: { plan: PlanRow; activeClients: number }) {
  const { pending, run } = useRun();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-xl uppercase">{plan.name}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {activeClients} clientes activos (mantienen su precio si lo cambias)
        </p>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const price = String(f.get("price") ?? "").replace(",", ".");
            run(() =>
              updatePlan({
                id: plan.id,
                name: String(f.get("name")),
                tagline: String(f.get("tagline") ?? ""),
                description: String(f.get("description") ?? ""),
                priceEuros: plan.requires_application || price === "" ? null : Number(price),
                isActive: f.get("isActive") === "on",
                highlights: String(f.get("highlights") ?? "")
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }),
            );
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input name="name" defaultValue={plan.name} />
            </div>
            <div className="space-y-1">
              <Label>Precio €/mes (IVA incl.)</Label>
              {plan.requires_application ? (
                <Input disabled value="A medida (no se publica)" />
              ) : (
                <Input
                  name="price"
                  inputMode="decimal"
                  defaultValue={plan.price_cents === null ? "" : (plan.price_cents / 100).toFixed(2).replace(".", ",")}
                />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Frase</Label>
            <Input name="tagline" defaultValue={plan.tagline ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Descripción</Label>
            <Textarea name="description" rows={2} defaultValue={plan.description ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Puntos destacados (uno por línea)</Label>
            <Textarea name="highlights" rows={5} defaultValue={plan.highlights.join("\n")} />
          </div>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox name="isActive" defaultChecked={plan.is_active} /> Activo (visible en /empezar)
          </Label>
          <Button type="submit" size="sm" disabled={pending}>
            Guardar plan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export type FeatureCell = {
  planId: string;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  label: string | null;
};

export function FeatureMatrix({
  plans,
  features,
  cells,
}: {
  plans: { id: string; name: string }[];
  features: { key: string; name: string; kind: string; unit: string | null }[];
  cells: FeatureCell[];
}) {
  const { pending, run } = useRun();
  const [state, setState] = useState(cells);
  const cell = (planId: string, featureKey: string) =>
    state.find((c) => c.planId === planId && c.featureKey === featureKey) ?? {
      planId,
      featureKey,
      enabled: false,
      limitValue: null,
      label: null,
    };

  function save(next: FeatureCell) {
    setState((s) => [...s.filter((c) => !(c.planId === next.planId && c.featureKey === next.featureKey)), next]);
    run(() => setPlanFeature(next));
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="p-3 text-left">Función</th>
            {plans.map((p) => (
              <th key={p.id} className="p-3 text-center">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {features.map((f) => (
            <tr key={f.key}>
              <td className="p-3">
                {f.name}
                {f.kind === "limit" ? (
                  <span className="block text-xs text-muted-foreground">
                    Límite: {f.unit === "days" ? "cada N días" : "al mes"} (vacío = ilimitado)
                  </span>
                ) : null}
              </td>
              {plans.map((p) => {
                const c = cell(p.id, f.key);
                return (
                  <td key={p.id} className="p-3 text-center align-top">
                    <Switch
                      checked={c.enabled}
                      disabled={pending}
                      aria-label={`${f.name} en ${p.name}`}
                      onCheckedChange={(v) => save({ ...c, enabled: v })}
                    />
                    {f.kind === "limit" && c.enabled ? (
                      <Input
                        className="mx-auto mt-2 h-8 w-20 text-center"
                        inputMode="numeric"
                        defaultValue={c.limitValue ?? ""}
                        aria-label={`Límite de ${f.name} en ${p.name}`}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const n = v === "" ? null : Number(v);
                          if (n !== c.limitValue && (n === null || Number.isInteger(n))) save({ ...c, limitValue: n });
                        }}
                      />
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type DiscountRow = {
  id: string;
  code: string | null;
  name: string;
  kind: "founder" | "student" | "squad" | "annual" | "custom";
  type: "percent" | "fixed" | "tiered_percent";
  value: number | null;
  tiers: { min_friends: number; percent: number }[] | null;
  duration: "once" | "repeating" | "forever";
  duration_months: number | null;
  applies_to_plan_keys: string[] | null;
  max_redemptions: number | null;
  expires_at: string | null;
  stackable: boolean;
  is_active: boolean;
  used: number;
};

export function DiscountEditor({ discount, planKeys }: { discount: DiscountRow | null; planKeys: string[] }) {
  const { pending, run } = useRun();
  const d = discount;
  const [type, setType] = useState(d?.type ?? "percent");
  const [duration, setDuration] = useState(d?.duration ?? "forever");

  return (
    <form
      className="space-y-3 rounded-xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const num = (k: string) => {
          const v = String(f.get(k) ?? "")
            .replace(",", ".")
            .trim();
          return v === "" ? null : Number(v);
        };
        const tiersText = String(f.get("tiers") ?? "").trim();
        run(() =>
          saveDiscount({
            id: d?.id,
            code: String(f.get("code") ?? "").trim() || null,
            name: String(f.get("name")),
            kind: d?.kind ?? "custom",
            type,
            value: type === "tiered_percent" ? null : num("value"),
            tiers:
              type === "tiered_percent"
                ? tiersText
                    .split("\n")
                    .filter(Boolean)
                    .map((l) => {
                      const [a, b] = l.split(/[:=]/).map((x) => Number(x.trim()));
                      return { min_friends: a ?? 0, percent: b ?? 0 };
                    })
                : null,
            duration,
            durationMonths: num("durationMonths"),
            appliesToPlanKeys: planKeys.filter((k) => f.get(`plan_${k}`) === "on"),
            maxRedemptions: num("maxRedemptions"),
            expiresAt: String(f.get("expiresAt") ?? "") || null,
            stackable: f.get("stackable") === "on",
            isActive: f.get("isActive") === "on",
          }),
        );
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{d ? d.name : "Nuevo código promocional"}</p>
        {d ? <span className="text-xs text-muted-foreground">{d.used} usos</span> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input name="name" defaultValue={d?.name ?? ""} required />
        </div>
        <div className="space-y-1">
          <Label>Código (vacío = automático)</Label>
          <Input
            name="code"
            defaultValue={d?.code ?? ""}
            disabled={d?.kind === "squad" || d?.kind === "annual" || d?.kind === "founder"}
          />
        </div>
        <div className="space-y-1">
          <Label>Tipo</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            disabled={d?.kind === "squad"}
          >
            <option value="percent">Porcentaje</option>
            <option value="fixed">Importe fijo €/mes</option>
            {d?.kind === "squad" ? <option value="tiered_percent">Por tramos (squad)</option> : null}
          </select>
        </div>
        {type === "tiered_percent" ? (
          <div className="space-y-1 sm:col-span-3">
            <Label>Tramos (amigos: %), uno por línea</Label>
            <Textarea
              name="tiers"
              rows={2}
              defaultValue={(d?.tiers ?? []).map((t) => `${t.min_friends}: ${t.percent}`).join("\n")}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <Label>{type === "percent" ? "Porcentaje" : "€ por mes"}</Label>
            <Input
              name="value"
              inputMode="decimal"
              defaultValue={
                d?.value == null
                  ? ""
                  : type === "fixed"
                    ? (d.value / 100).toFixed(2).replace(".", ",")
                    : String(d.value)
              }
            />
          </div>
        )}
        <div className="space-y-1">
          <Label>Duración</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={duration}
            onChange={(e) => setDuration(e.target.value as typeof duration)}
          >
            <option value="forever">Siempre</option>
            <option value="once">Primer pago</option>
            <option value="repeating">N meses</option>
          </select>
        </div>
        {duration === "repeating" ? (
          <div className="space-y-1">
            <Label>Meses</Label>
            <Input name="durationMonths" inputMode="numeric" defaultValue={d?.duration_months ?? ""} />
          </div>
        ) : null}
        <div className="space-y-1">
          <Label>Límite de usos (vacío = sin límite)</Label>
          <Input name="maxRedemptions" inputMode="numeric" defaultValue={d?.max_redemptions ?? ""} />
        </div>
        <div className="space-y-1">
          <Label>Caduca</Label>
          <Input name="expiresAt" type="date" defaultValue={d?.expires_at?.slice(0, 10) ?? ""} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-muted-foreground">Planes:</span>
        {planKeys.map((k) => (
          <Label key={k} className="flex items-center gap-1.5 font-normal">
            <Checkbox
              name={`plan_${k}`}
              defaultChecked={!d?.applies_to_plan_keys || d.applies_to_plan_keys.includes(k)}
            />{" "}
            {k}
          </Label>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox name="stackable" defaultChecked={d?.stackable ?? true} /> Acumulable
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox name="isActive" defaultChecked={d?.is_active ?? true} /> Activo
        </Label>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}
