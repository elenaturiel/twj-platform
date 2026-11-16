"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantPeriodCredits } from "@/features/billing/fulfillment";
import { todayInMadrid } from "@/lib/dates";

export type OverrideResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  clientId: z.uuid(),
  featureKey: z.string().regex(/^[a-z0-9_]+$/),
  /** null = volver a lo que dice el plan */
  enabled: z.boolean().nullable(),
  limit: z.number().int().min(0).max(1000).nullable(),
});

/**
 * Ajusta lo que incluye el plan para un cliente concreto (planes a medida como HYROX):
 * activar o quitar algo, o cambiar la cantidad (directos al mes, días entre check-ins…).
 */
export async function setClientFeature(input: z.input<typeof schema>): Promise<OverrideResult> {
  const viewer = await requireScope("billing");
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: "Valor no válido." };
  const supabase = await createClient();
  if (p.data.enabled === null) {
    const { error } = await supabase
      .from("client_feature_overrides")
      .delete()
      .eq("client_id", p.data.clientId)
      .eq("feature_key", p.data.featureKey);
    if (error) return { ok: false, error: "No se ha podido guardar." };
  } else {
    const { error } = await supabase.from("client_feature_overrides").upsert(
      {
        client_id: p.data.clientId,
        feature_key: p.data.featureKey,
        enabled: p.data.enabled,
        limit_value: p.data.limit,
        created_by: viewer.id,
      },
      { onConflict: "client_id,feature_key" },
    );
    if (error) return { ok: false, error: "No se ha podido guardar." };
  }
  // Si cambian los directos o la videollamada, que tenga ya los créditos de este mes
  if (["live_sessions", "monthly_call"].includes(p.data.featureKey)) {
    const { data: sub } = await createAdminClient()
      .from("subscriptions")
      .select("current_period_start")
      .eq("client_id", p.data.clientId)
      .eq("status", "active")
      .maybeSingle();
    if (sub?.current_period_start) await grantPeriodCredits(p.data.clientId, sub.current_period_start, todayInMadrid());
  }
  revalidatePath(`/panel/clientes/${p.data.clientId}`, "layout");
  return { ok: true };
}
