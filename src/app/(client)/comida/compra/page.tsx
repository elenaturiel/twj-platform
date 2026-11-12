import type { Metadata } from "next";
import Link from "next/link";
import { clientHasFeature, requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { mondayOf } from "@/domain/training/week";
import { weeklyBudgetCents } from "@/domain/nutrition/shopping";
import { getCurrentPublishedPlan } from "@/features/nutrition/queries";
import { ShoppingList, type ShoppingItem } from "@/features/nutrition/ui/shopping-list";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Lista de la compra" };

export default async function ShoppingPage() {
  const ctx = await requireClientWithAccess();
  const back = (
    <Link href="/comida" className="text-sm text-muted-foreground hover:underline">
      ← Comida
    </Link>
  );
  if (!(await clientHasFeature(ctx.client.id, "shopping_list"))) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title="La lista de la compra va con el plan nutricional (All In o superior)." />
      </div>
    );
  }
  const plan = await getCurrentPublishedPlan(ctx.client.id, mondayOf(todayInMadrid()));
  const supabase = await createClient();
  const [{ data: list }, { data: intake }] = await Promise.all([
    plan
      ? supabase
          .from("shopping_lists")
          .select("persons, shopping_list_items(id, name, section, quantity_g, units, packs, estimated_cents, checked)")
          .eq("meal_plan_id", plan.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("client_intake")
      .select("food_budget_cents, food_budget_period")
      .eq("client_id", ctx.client.id)
      .maybeSingle(),
  ]);
  return (
    <div className="space-y-4">
      {back}
      <h1 className="text-3xl font-extrabold">Lista de la compra</h1>
      {plan ? (
        <ShoppingList
          planId={plan.id}
          persons={list?.persons ?? null}
          items={
            (list?.shopping_list_items ?? []).map((i) => ({
              ...i,
              quantity_g: i.quantity_g == null ? null : Number(i.quantity_g),
              units: i.units == null ? null : Number(i.units),
            })) as ShoppingItem[]
          }
          budgetCents={weeklyBudgetCents(
            intake?.food_budget_cents ?? null,
            (intake?.food_budget_period ?? "week") as "week" | "month",
          )}
        />
      ) : (
        <EmptyState title="Cuando Jaime publique tu menú, aquí sale la lista ordenada por pasillos." />
      )}
    </div>
  );
}
