import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { NewClientForm } from "@/features/clients/new-client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage() {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("key, name, price_cents, annual_allowed")
    .eq("is_active", true)
    .order("sort_order");
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="text-3xl font-extrabold">Nuevo cliente</h1>
      <NewClientForm
        plans={(plans ?? []).map((p) => ({
          key: p.key,
          name: p.name,
          priceCents: p.price_cents,
          annualAllowed: p.annual_allowed,
        }))}
      />
    </div>
  );
}
