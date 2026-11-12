"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatEuros } from "@/lib/money";
import { generateShoppingList, toggleShoppingItem } from "../client-actions";

export type ShoppingItem = {
  id: string;
  name: string;
  section: string;
  quantity_g: number | null;
  units: number | null;
  packs: number | null;
  estimated_cents: number | null;
  checked: boolean;
};

export function ShoppingList({
  planId,
  persons,
  items,
  budgetCents,
}: {
  planId: string;
  persons: number | null;
  items: ShoppingItem[];
  budgetCents: number | null;
}) {
  const router = useRouter();
  const [n, setN] = useState(persons ?? 1);
  const [checked, setChecked] = useState(() => new Set(items.filter((i) => i.checked).map((i) => i.id)));
  const [pending, start] = useTransition();
  const sections = [...new Set(items.map((i) => i.section))];
  const total = items.reduce((s, i) => s + (i.estimated_cents ?? 0), 0);
  const missing = items.filter((i) => i.estimated_cents == null).length;

  return (
    <div className="space-y-4">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await generateShoppingList(planId, n);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Lista actualizada");
            router.refresh();
          });
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="persons">Personas</Label>
          <Input
            id="persons"
            type="number"
            min={1}
            max={10}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="w-20"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {items.length ? "Recalcular" : "Generar lista"}
        </Button>
      </form>

      {items.length ? (
        <>
          <section className="space-y-2 rounded-2xl border bg-card p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Coste estimado</span>
              <span className="text-2xl font-extrabold tabular-nums">
                {missing < items.length ? formatEuros(total) : "—"}
              </span>
            </div>
            {missing === items.length ? (
              <p className="text-xs text-muted-foreground">
                Aún no hay precios orientativos de estos productos; Jaime los irá añadiendo.
              </p>
            ) : budgetCents ? (
              <>
                <Progress value={Math.min(100, (total / budgetCents) * 100)} aria-label="Gasto frente al presupuesto" />
                <p className="text-xs text-muted-foreground">
                  Tu presupuesto: {formatEuros(budgetCents)}/semana.{" "}
                  {total <= budgetCents
                    ? "Vas dentro del presupuesto."
                    : "Te pasas un poco: díselo a Jaime y lo ajusta."}
                </p>
              </>
            ) : null}
            {missing && missing < items.length ? (
              <p className="text-xs text-muted-foreground">{missing} productos sin precio orientativo (no suman).</p>
            ) : null}
          </section>
          {sections.map((s) => (
            <section key={s} className="space-y-1">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{s}</h3>
              <ul className="divide-y rounded-xl border">
                {items
                  .filter((i) => i.section === s)
                  .map((i) => (
                    <li key={i.id}>
                      <Label className="flex items-center gap-3 px-3 py-2.5 font-normal">
                        <Checkbox
                          checked={checked.has(i.id)}
                          onCheckedChange={(v) => {
                            const on = v === true;
                            setChecked((cur) => {
                              const next = new Set(cur);
                              if (on) next.add(i.id);
                              else next.delete(i.id);
                              return next;
                            });
                            void toggleShoppingItem(i.id, on);
                          }}
                        />
                        <span className={`flex-1 ${checked.has(i.id) ? "text-muted-foreground line-through" : ""}`}>
                          {i.name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {i.quantity_g != null
                            ? `${Math.round(i.quantity_g)} g`
                            : i.units != null
                              ? `${i.units} ud.`
                              : ""}
                          {i.packs ? ` · ${i.packs} env.` : ""}
                          {i.estimated_cents != null ? ` · ${formatEuros(i.estimated_cents)}` : ""}
                        </span>
                      </Label>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Genera la lista a partir del menú de esta semana.</p>
      )}
    </div>
  );
}
