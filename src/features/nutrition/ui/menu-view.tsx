"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { itemMacros, SLOT_LABELS, sumMacros } from "@/domain/nutrition/macros";
import { DAY_SHORT, DAY_NAMES } from "@/domain/training/week";
import type { MealNode, PlanNode } from "../queries";
import { requestMealChange } from "../client-actions";
import { MacroLine } from "./macro-badge";
import { DayNotes, type DayNote } from "./day-notes";

/** Menú semanal del cliente: un día cada vez, con macros, pedir cambio y notas. */
export function MenuView({
  plan,
  initialDay,
  dates,
  notes,
  viewerId,
}: {
  plan: PlanNode;
  initialDay: number;
  dates: string[];
  notes: Record<string, DayNote[]>;
  viewerId: string;
}) {
  const [day, setDay] = useState(initialDay);
  const [changeFor, setChangeFor] = useState<MealNode | "day" | null>(null);
  const d = plan.meal_plan_days.find((x) => x.day_index === day);
  const total = d ? sumMacros(d.meals.flatMap((m) => m.meal_items.map((i) => itemMacros(i.foods, i)))) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Días">
        {DAY_SHORT.map((l, i) => (
          <button
            key={l}
            role="tab"
            aria-selected={day === i}
            aria-label={DAY_NAMES[i]}
            onClick={() => setDay(i)}
            className={cn(
              "flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-semibold",
              day === i && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {l}
            <span className="text-[10px] font-normal opacity-80">{dates[i]?.slice(8)}</span>
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold">{DAY_NAMES[day]}</h2>
        {total && total.kcal > 0 ? <MacroLine m={total} /> : null}
      </div>

      {d && d.meals.length ? (
        <ul className="space-y-3">
          {d.meals.map((m) => {
            const mm = sumMacros(m.meal_items.map((i) => itemMacros(i.foods, i)));
            return (
              <li key={m.id} className="space-y-2 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-accent uppercase">{SLOT_LABELS[m.slot]}</p>
                    {m.title ? <p className="font-semibold">{m.title}</p> : null}
                  </div>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setChangeFor(m)}>
                    <MessageSquarePlus className="size-4" /> Cambiar
                  </Button>
                </div>
                <ul className="space-y-1 text-sm">
                  {m.meal_items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-2">
                      <span>{i.foods.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {i.quantity_g != null
                          ? `${i.quantity_g} g`
                          : `${i.quantity_units} ${i.foods.unit_name ?? "ud."}`}
                      </span>
                    </li>
                  ))}
                </ul>
                {m.notes ? <p className="text-xs text-muted-foreground italic">{m.notes}</p> : null}
                {m.meal_items.length ? <MacroLine m={mm} /> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Día libre de menú. Come con cabeza (y sin culpa).
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Notas del día</h3>
        <DayNotes notes={notes[dates[day] ?? ""] ?? []} date={dates[day] ?? ""} viewerId={viewerId} />
      </section>

      <Button variant="outline" className="w-full" onClick={() => setChangeFor("day")}>
        Pedir un cambio en este día
      </Button>

      <Dialog open={changeFor !== null} onOpenChange={(o) => !o && setChangeFor(null)}>
        <DialogContent>
          {changeFor ? (
            <ChangeForm
              planId={plan.id}
              dayIndex={day}
              meal={changeFor === "day" ? null : changeFor}
              onDone={() => setChangeFor(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChangeForm({
  planId,
  dayIndex,
  meal,
  onDone,
}: {
  planId: string;
  dayIndex: number;
  meal: MealNode | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await requestMealChange({ planId, mealId: meal?.id ?? null, dayIndex, reason });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Enviado a Jaime. Te avisamos cuando lo cambie.");
          onDone();
          router.refresh();
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>
          Pedir cambio: {DAY_NAMES[dayIndex]}
          {meal ? ` · ${SLOT_LABELS[meal.slot]}` : ""}
        </DialogTitle>
      </DialogHeader>
      <Textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="No me gusta el atún, ese día como en la uni, me sobra cantidad…"
        aria-label="Motivo del cambio"
      />
      <DialogFooter>
        <Button type="submit" disabled={pending || reason.trim().length < 3}>
          Enviar a Jaime
        </Button>
      </DialogFooter>
    </form>
  );
}
