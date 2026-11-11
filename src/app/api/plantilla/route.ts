import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { buildImportTemplate } from "@/features/import/template.server";

/** Plantilla de Excel (rutinas y dietas) con los ejercicios y alimentos de la biblioteca de Jaime. */
export async function GET() {
  await requireScope("clients");
  const supabase = await createClient();
  const [{ data: exercises }, { data: foods }] = await Promise.all([
    supabase.from("exercises").select("name").eq("is_active", true).limit(2000),
    supabase.from("foods").select("name").eq("is_active", true).limit(5000),
  ]);
  const buf = await buildImportTemplate({
    exercises: (exercises ?? []).map((e) => e.name),
    foods: (foods ?? []).map((f) => f.name),
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-rutinas-y-dietas-twj.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
