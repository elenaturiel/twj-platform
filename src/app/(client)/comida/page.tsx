import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, Pill, Utensils } from "lucide-react";
import { cheapestPlanWith, clientHasFeature, requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { addDays } from "@/domain/billing/renewal";
import { mondayOf, weekdayMondayFirst } from "@/domain/training/week";
import { getCurrentPublishedPlan } from "@/features/nutrition/queries";
import { MenuView } from "@/features/nutrition/ui/menu-view";
import type { DayNote } from "@/features/nutrition/ui/day-notes";
import { LockedFeature } from "@/components/twj/locked-feature";
import { EmptyState } from "@/components/twj/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Comida" };

export default async function FoodPage() {
  const ctx = await requireClientWithAccess();
  if (!(await clientHasFeature(ctx.client.id, "nutrition_plan"))) {
    const plan = await cheapestPlanWith("nutrition_plan");
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Comida</h1>
        <LockedFeature planName={plan?.name ?? "All In"} planKey={plan?.key ?? "all_in"} />
        <Button asChild variant="outline" className="w-full">
          <Link href="/comida/suplementos">
            <Pill className="size-4" /> Suplementación honesta
          </Link>
        </Button>
      </div>
    );
  }

  const today = todayInMadrid();
  const week = mondayOf(today);
  const plan = await getCurrentPublishedPlan(ctx.client.id, week);
  const planWeek = plan?.week_start ?? week;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(planWeek, i));
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("day_notes")
    .select("id, date, body, author_id, created_at, profiles(full_name)")
    .eq("client_id", ctx.client.id)
    .gte("date", dates[0]!)
    .lte("date", dates[6]!)
    .order("created_at");
  const byDate: Record<string, DayNote[]> = {};
  for (const n of notes ?? [])
    (byDate[n.date] ??= []).push({
      id: n.id,
      body: n.body,
      author_id: n.author_id,
      created_at: n.created_at,
      author_name: n.profiles?.full_name ?? null,
    });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {plan && plan.week_start !== week
              ? "Menú de la semana pasada (aún no hay nuevo)"
              : "Tu menú de esta semana"}
          </p>
          <h1 className="text-3xl font-extrabold">Comida</h1>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline">
          <Link href="/comida/compra">
            <ShoppingCart className="size-4" /> Lista de la compra
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/comida/suplementos">
            <Pill className="size-4" /> Suplementos
          </Link>
        </Button>
      </div>
      {plan ? (
        <MenuView
          plan={plan}
          initialDay={plan.week_start === week ? weekdayMondayFirst(today) : 0}
          dates={dates}
          notes={byDate}
          viewerId={ctx.viewer.id}
        />
      ) : (
        <EmptyState
          icon={Utensils}
          title="Jaime está preparando tu menú. Tranquilidad: no va a ser pechuga con brócoli los 7 días."
        />
      )}
      <p className="text-xs text-muted-foreground">
        Este plan es orientativo y no sustituye el consejo de un médico o dietista-nutricionista. Si tienes una
        condición de salud, coméntalo con Jaime.
      </p>
    </div>
  );
}
