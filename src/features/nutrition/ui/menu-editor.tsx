"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EU_ALLERGENS } from "@/domain/onboarding/rules";
import { allergenConflicts } from "@/domain/nutrition/allergens";
import { itemMacros, SLOT_LABELS, SLOTS, sumMacros, type Slot } from "@/domain/nutrition/macros";
import { DAY_NAMES } from "@/domain/training/week";
import type { FoodRow, ItemNode, MealNode, PlanNode } from "../queries";
import {
  addMeal,
  copyDay,
  copyMealPlan,
  deleteMeal,
  deleteMealItem,
  deleteMealPlan,
  saveMealItem,
  setMealPlanStatus,
  type NutritionResult,
} from "../staff-actions";
import { MacroLine } from "./macro-badge";

const allergenLabel = (k: string) => EU_ALLERGENS.find((a) => a.key === k)?.label ?? k;

export function MenuEditor({
  plan,
  foods,
  clientAllergens,
  backHref,
  nextWeekStart,
}: {
  plan: PlanNode;
  foods: FoodRow[];
  clientAllergens: string[];
  backHref: string;
  nextWeekStart?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [itemDialog, setItemDialog] = useState<{ meal: MealNode; item?: ItemNode } | null>(null);
  const run = (fn: () => Promise<NutritionResult>, ok = "Guardado", after?: (r: NutritionResult) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? ok);
        after?.(r);
        router.refresh();
      } else toast.error(r.error);
    });

  const dayTotals = plan.meal_plan_days.map((d) =>
    sumMacros(d.meals.flatMap((m) => m.meal_items.map((i) => itemMacros(i.foods, i)))),
  );
  const withFood = dayTotals.filter((t) => t.kcal > 0);
  const avg = withFood.length ? sumMacros(withFood) : null;
  const isTemplate = !plan.client_id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        {isTemplate ? (
          <Badge variant="secondary">Plantilla</Badge>
        ) : (
          <Badge variant={plan.status === "published" ? "default" : "outline"}>
            {plan.status === "published" ? "Publicado" : "Borrador (el cliente no lo ve)"}
          </Badge>
        )}
        {avg ? (
          <span className="text-sm">
            Media diaria:{" "}
            <MacroLine
              m={{
                ...avg,
                kcal: avg.kcal / withFood.length,
                protein: avg.protein / withFood.length,
                carbs: avg.carbs / withFood.length,
                fat: avg.fat / withFood.length,
              }}
            />
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          {!isTemplate && plan.status !== "published" ? (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => setMealPlanStatus(plan.id, "published"), "Publicado: el cliente ya lo ve")}
            >
              Publicar al cliente
            </Button>
          ) : null}
          {!isTemplate && plan.status === "published" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => setMealPlanStatus(plan.id, "draft"), "Vuelve a borrador")}
            >
              Despublicar
            </Button>
          ) : null}
          {!isTemplate && nextWeekStart ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => copyMealPlan({ planId: plan.id, toClientId: plan.client_id, weekStart: nextWeekStart }),
                  "Copiado a la semana siguiente (borrador)",
                  (r) => r.ok && r.id && router.push(`${backHref}?semana=${nextWeekStart}`),
                )
              }
            >
              <Copy className="size-4" /> Repetir la semana siguiente
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              const name = prompt("Nombre de la plantilla de menú:", "Menú semanal");
              if (name) run(() => copyMealPlan({ planId: plan.id, asTemplateName: name }), "Guardado como plantilla");
            }}
          >
            Guardar como plantilla
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() =>
              confirm("¿Borrar este menú entero?") &&
              run(
                () => deleteMealPlan(plan.id),
                "Menú borrado",
                () => router.push(backHref),
              )
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {clientAllergens.length ? (
        <p className="text-xs text-muted-foreground">
          Alergias del cliente: <strong>{clientAllergens.map(allergenLabel).join(", ")}</strong>. Los alimentos que
          chocan se marcan en rojo.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {plan.meal_plan_days.map((d, di) => (
          <section key={d.id} className="space-y-2 rounded-xl border bg-card p-3" aria-label={DAY_NAMES[d.day_index]}>
            <header className="flex items-center gap-2">
              <h3 className="font-bold">{DAY_NAMES[d.day_index]}</h3>
              <MacroLine m={dayTotals[di]!} className="ml-auto" />
            </header>
            {d.meals.map((m) => {
              const mm = sumMacros(m.meal_items.map((i) => itemMacros(i.foods, i)));
              return (
                <div key={m.id} className="space-y-1 rounded-md bg-muted/40 p-2">
                  <div className="flex items-center gap-1">
                    <p className="flex-1 text-sm font-semibold">
                      {SLOT_LABELS[m.slot]}
                      {m.title ? ` · ${m.title}` : ""}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label="Borrar comida"
                      disabled={pending}
                      onClick={() => run(() => deleteMeal(m.id), "Comida borrada")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <ul className="space-y-0.5 text-sm">
                    {m.meal_items.map((i) => {
                      const conflicts = allergenConflicts(i.foods.allergens, clientAllergens);
                      return (
                        <li key={i.id} className="group flex items-center gap-1">
                          <button
                            type="button"
                            className="flex-1 text-left hover:underline"
                            onClick={() => setItemDialog({ meal: m, item: i })}
                          >
                            <span className={conflicts.length ? "font-medium text-destructive" : ""}>
                              {conflicts.length ? (
                                <AlertTriangle
                                  className="mr-0.5 inline size-3"
                                  aria-label={`Contiene ${conflicts.map(allergenLabel).join(", ")}`}
                                />
                              ) : null}
                              {i.foods.name}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              ·{" "}
                              {i.quantity_g != null
                                ? `${i.quantity_g} g`
                                : `${i.quantity_units} ${i.foods.unit_name ?? "ud."}`}
                            </span>
                          </button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 opacity-60"
                            aria-label="Quitar alimento"
                            disabled={pending}
                            onClick={() => run(() => deleteMealItem(i.id), "Quitado")}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-center justify-between">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setItemDialog({ meal: m })}>
                      <Plus className="size-3.5" /> Alimento
                    </Button>
                    {m.meal_items.length ? <MacroLine m={mm} /> : null}
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-1">
              <select
                aria-label={`Añadir comida el ${DAY_NAMES[d.day_index]}`}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value=""
                onChange={(e) =>
                  e.target.value && run(() => addMeal({ dayId: d.id, slot: e.target.value as Slot }), "Comida añadida")
                }
              >
                <option value="">+ Comida…</option>
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_LABELS[s]}
                  </option>
                ))}
              </select>
              {d.meals.length ? (
                <select
                  aria-label={`Copiar ${DAY_NAMES[d.day_index]} a otro día`}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const targets =
                      v === "all"
                        ? plan.meal_plan_days.filter((x) => x.id !== d.id && !x.meals.length).map((x) => x.id)
                        : [v];
                    run(() => copyDay(d.id, targets), "Día copiado");
                  }}
                >
                  <option value="">Copiar a…</option>
                  <option value="all">Todos los días vacíos</option>
                  {plan.meal_plan_days
                    .filter((x) => x.id !== d.id)
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {DAY_NAMES[x.day_index]}
                      </option>
                    ))}
                </select>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={itemDialog !== null} onOpenChange={(o) => !o && setItemDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {itemDialog ? (
            <ItemForm
              meal={itemDialog.meal}
              item={itemDialog.item}
              foods={foods}
              clientAllergens={clientAllergens}
              pending={pending}
              onSubmit={(input) =>
                run(
                  () => saveMealItem(input),
                  "Guardado",
                  () => setItemDialog(null),
                )
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemForm({
  meal,
  item,
  foods,
  clientAllergens,
  pending,
  onSubmit,
}: {
  meal: MealNode;
  item?: ItemNode;
  foods: FoodRow[];
  clientAllergens: string[];
  pending: boolean;
  onSubmit: (i: {
    id?: string;
    mealId: string;
    foodId: string;
    quantityG: number | null;
    quantityUnits: number | null;
    notes: string | null;
  }) => void;
}) {
  const [q, setQ] = useState("");
  const [foodId, setFoodId] = useState(item?.food_id ?? "");
  const [byUnits, setByUnits] = useState(item ? item.quantity_g == null : false);
  const [qty, setQty] = useState(item ? String(item.quantity_g ?? item.quantity_units ?? "") : "");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return foods
      .filter((f) => !t || f.name.toLowerCase().includes(t) || (f.brand ?? "").toLowerCase().includes(t))
      .slice(0, 60);
  }, [foods, q]);
  const food = foods.find((f) => f.id === foodId);
  const conflicts = food ? allergenConflicts(food.allergens, clientAllergens) : [];
  const n = Number(qty.replace(",", "."));
  const preview =
    food && n > 0 ? itemMacros(food, { quantity_g: byUnits ? null : n, quantity_units: byUnits ? n : null }) : null;

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!foodId || !(n > 0)) return void toast.error("Elige alimento y cantidad.");
        onSubmit({
          id: item?.id,
          mealId: meal.id,
          foodId,
          quantityG: byUnits ? null : n,
          quantityUnits: byUnits ? n : null,
          notes: null,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {SLOT_LABELS[meal.slot]}: {item ? "editar alimento" : "añadir alimento"}
        </DialogTitle>
      </DialogHeader>
      <Input
        placeholder="Buscar en tu base de alimentos…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar alimento"
      />
      <ul className="max-h-52 overflow-y-auto rounded-md border text-sm" role="listbox" aria-label="Alimentos">
        {list.map((f) => {
          const c = allergenConflicts(f.allergens, clientAllergens);
          return (
            <li key={f.id}>
              <button
                type="button"
                role="option"
                aria-selected={f.id === foodId}
                onClick={() => {
                  setFoodId(f.id);
                  if (!f.unit_grams) setByUnits(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-muted ${f.id === foodId ? "bg-secondary font-medium" : ""}`}
              >
                <span className={c.length ? "text-destructive" : ""}>
                  {f.name}
                  {f.brand ? <span className="text-muted-foreground"> · {f.brand}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {f.kcal != null ? `${Math.round(f.kcal)} kcal/100 g` : "sin datos"}
                  {!f.verified ? " · sin verificar" : ""}
                </span>
              </button>
            </li>
          );
        })}
        {!list.length ? (
          <li className="px-3 py-2 text-muted-foreground">Sin resultados. Añádelo en Biblioteca → Alimentos.</li>
        ) : null}
      </ul>
      {conflicts.length ? (
        <p className="flex items-center gap-1 text-sm text-destructive" role="alert">
          <AlertTriangle className="size-4" /> Contiene {conflicts.map(allergenLabel).join(", ")}, que choca con la
          ficha del cliente.
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="qty">Cantidad</Label>
          <Input id="qty" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="w-28" />
        </div>
        <select
          aria-label="Unidad"
          value={byUnits ? "u" : "g"}
          onChange={(e) => setByUnits(e.target.value === "u")}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="g">gramos</option>
          {food?.unit_grams ? (
            <option value="u">
              {food.unit_name ?? "unidades"} ({food.unit_grams} g)
            </option>
          ) : null}
        </select>
      </div>
      {preview ? <MacroLine m={preview} /> : null}
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
