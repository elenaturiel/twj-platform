import Link from "next/link";
import { notFound } from "next/navigation";
import { getFoods, getPlanTree } from "@/features/nutrition/queries";
import { MenuEditor } from "@/features/nutrition/ui/menu-editor";

export default async function MenuTemplateEditor({ params }: PageProps<"/panel/biblioteca/menus/[id]">) {
  const { id } = await params;
  const [plan, foods] = await Promise.all([getPlanTree(id), getFoods()]);
  if (!plan || !plan.template_id) notFound();
  return (
    <div className="space-y-3">
      <Link href="/panel/biblioteca/menus" className="text-sm text-muted-foreground hover:underline">
        ← Plantillas de menú
      </Link>
      <MenuEditor plan={plan} foods={foods} clientAllergens={[]} backHref="/panel/biblioteca/menus" />
    </div>
  );
}
