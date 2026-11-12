import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBlockTree, getExerciseLibrary } from "@/features/training/queries";
import { BlockEditor } from "@/features/training/ui/block-editor";

export default async function BlockPage({ params }: PageProps<"/panel/clientes/[id]/entreno/[blockId]">) {
  const { id, blockId } = await params;
  const supabase = await createClient();
  const [block, exercises, { data: stations }] = await Promise.all([
    getBlockTree(blockId),
    getExerciseLibrary(),
    supabase.from("hyrox_stations").select("key, name").order("sort_order"),
  ]);
  if (!block || block.client_id !== id) notFound();
  const base = `/panel/clientes/${id}/entreno`;
  return (
    <div className="space-y-3">
      <Link href={base} className="text-sm text-muted-foreground hover:underline">
        ← Bloques
      </Link>
      <BlockEditor block={block} exercises={exercises} stations={stations ?? []} backHref={base} />
    </div>
  );
}
