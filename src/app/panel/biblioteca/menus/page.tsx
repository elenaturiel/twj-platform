import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewMenuTemplateForm } from "@/features/nutrition/ui/staff-panels";
import { formatDate } from "@/features/clients/ui";

export const metadata: Metadata = { title: "Plantillas de menú" };

export default async function MenuTemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_plans")
    .select("id, created_at, meal_templates!inner(name, description)")
    .not("template_id", "is", null)
    .order("created_at", { ascending: false });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Se aplican desde la pestaña Nutrición de cada cliente (se copian y se pueden ajustar).
      </p>
      <ul className="divide-y rounded-xl border">
        {(data ?? []).map((p) => (
          <li key={p.id} className="px-3 py-2.5 text-sm">
            <Link href={`/panel/biblioteca/menus/${p.id}`} className="font-medium hover:underline">
              {p.meal_templates.name}
            </Link>
            <span className="block text-xs text-muted-foreground">creada {formatDate(p.created_at)}</span>
          </li>
        ))}
        {!data?.length ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">Aún no hay plantillas de menú.</li>
        ) : null}
      </ul>
      <NewMenuTemplateForm />
    </div>
  );
}
