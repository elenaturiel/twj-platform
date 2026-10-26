import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PublicPlan = {
  id: string;
  key: string;
  name: string;
  tagline: string | null;
  description: string | null;
  highlights: string[];
  priceCents: number | null;
  annualAllowed: boolean;
  requiresApplication: boolean;
  badge: string | null;
};

export async function getPublicPlans(): Promise<PublicPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("public_plans").select("*").order("sort_order");
  return (data ?? []).map((p) => ({
    id: p.id!,
    key: p.key!,
    name: p.name!,
    tagline: p.tagline,
    description: p.description,
    highlights: p.highlights ?? [],
    priceCents: p.price_cents,
    annualAllowed: Boolean(p.annual_allowed),
    requiresApplication: Boolean(p.requires_application),
    badge: p.badge,
  }));
}

export async function getFounderSlotsLeft(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("founder_slots_left");
  return data ?? 0;
}

/** Planes en los que aplica el descuento squad (configurable en el panel). */
export async function getSquadPlanKeys(): Promise<string[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("discounts")
    .select("applies_to_plan_keys")
    .eq("kind", "squad")
    .eq("is_active", true);
  return [...new Set((data ?? []).flatMap((d) => d.applies_to_plan_keys ?? []))];
}
