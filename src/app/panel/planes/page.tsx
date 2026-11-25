import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  DiscountEditor,
  FeatureMatrix,
  PlanCard,
  type DiscountRow,
  type PlanRow,
} from "@/features/config/plans-editor";

export const metadata: Metadata = { title: "Planes y descuentos" };

export default async function PlansPage() {
  await requireScope("billing");
  const supabase = await createClient();
  const [
    { data: plans },
    { data: features },
    { data: cells },
    { data: discounts },
    { data: redemptions },
    { data: clients },
    { data: slots },
  ] = await Promise.all([
    supabase
      .from("plans")
      .select("id, key, name, tagline, description, price_cents, is_active, requires_application, highlights")
      .order("sort_order"),
    supabase.from("features").select("key, name, kind, unit").order("sort_order"),
    supabase.from("plan_features").select("plan_id, feature_key, enabled, limit_value, label"),
    supabase.from("discounts").select("*").order("created_at"),
    supabase.from("discount_redemptions").select("discount_id").eq("status", "applied"),
    supabase.from("clients").select("plan_id").in("status", ["active", "past_due"]),
    supabase.rpc("founder_slots_left"),
  ]);

  const used = (id: string) => (redemptions ?? []).filter((r) => r.discount_id === id).length;
  const planKeys = (plans ?? []).map((p) => p.key);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Planes y descuentos</h1>
        <p className="text-sm text-muted-foreground">
          Todo lo que se cambia aquí se aplica sin tocar código. Plazas fundador libres: {slots ?? 0}.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Planes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(plans ?? []).map((p) => (
            <PlanCard
              key={p.id}
              plan={p as PlanRow}
              activeClients={(clients ?? []).filter((c) => c.plan_id === p.id).length}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Funciones por plan</h2>
        <p className="text-sm text-muted-foreground">
          Lo desactivado se le muestra al cliente como «Esto va en el plan…». Para excepciones de un cliente concreto,
          usa su ficha.
        </p>
        <FeatureMatrix
          plans={(plans ?? []).map((p) => ({ id: p.id, name: p.name }))}
          features={features ?? []}
          cells={(cells ?? []).map((c) => ({
            planId: c.plan_id,
            featureKey: c.feature_key,
            enabled: c.enabled,
            limitValue: c.limit_value,
            label: c.label,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Descuentos</h2>
        <p className="text-sm text-muted-foreground">
          Los descuentos acumulables se suman entre sí (p. ej. anual 20 % + squad 25 % + estudiante 10 %).
        </p>
        <div className="space-y-3">
          {(discounts ?? []).map((d) => (
            <DiscountEditor
              key={d.id}
              discount={{
                ...(d as unknown as DiscountRow),
                value: d.value === null ? null : Number(d.value),
                used: used(d.id),
              }}
              planKeys={planKeys}
            />
          ))}
          <DiscountEditor discount={null} planKeys={planKeys} />
        </div>
      </section>
    </div>
  );
}
