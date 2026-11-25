import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBlockTree, getExerciseLibrary } from "@/features/training/queries";
import { BlockEditor } from "@/features/training/ui/block-editor";

export default async function TemplateEditorPage({ params }: PageProps<"/panel/biblioteca/plantillas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [block, exercises, { data: stations }] = await Promise.all([
    getBlockTree(id),
    getExerciseLibrary(),
    supabase.from("hyrox_stations").select("key, name").order("sort_order"),
  ]);
  if (!block || !block.template_id) notFound();
  return (
    <div className="space-y-3">
      <Link href="/panel/biblioteca/plantillas" className="text-sm text-muted-foreground hover:underline">
        ← Plantillas
      </Link>
      <BlockEditor
        block={block}
        exercises={exercises}
        stations={stations ?? []}
        backHref="/panel/biblioteca/plantillas"
      />
    </div>
  );
}
