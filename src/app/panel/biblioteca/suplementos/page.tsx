import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AffiliateLinkForm } from "@/features/nutrition/ui/staff-panels";

export const metadata: Metadata = { title: "Suplementos" };

export default async function SupplementsAdmin() {
  const supabase = await createClient();
  const [{ data: links }, { data: clicks }] = await Promise.all([
    supabase.from("affiliate_links").select("id, label, description, url, code, is_active").order("sort_order"),
    supabase.from("affiliate_clicks").select("link_id"),
  ]);
  const count = (id: string) => (clicks ?? []).filter((c) => c.link_id === id).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Enlaces de afiliado (HSN). Al cliente se le muestra siempre el aviso de afiliado.{" "}
        {/* TODO(Jaime): código de afiliado HSN */}
      </p>
      {(links ?? []).map((l) => (
        <div key={l.id} className="space-y-1">
          <AffiliateLinkForm link={l} />
          <p className="pl-1 text-xs text-muted-foreground">{count(l.id)} clics</p>
        </div>
      ))}
      <AffiliateLinkForm link={null} />
    </div>
  );
}
