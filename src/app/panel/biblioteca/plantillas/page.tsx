import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteTemplateButton } from "@/features/training/ui/block-forms";
import { NewTemplateForm } from "./new-template-form";
import { formatDate } from "@/features/clients/ui";

export const metadata: Metadata = { title: "Plantillas de entreno" };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_templates")
    .select("id, name, description, created_at, workout_blocks(id, workout_weeks(id))")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Las plantillas se asignan a un cliente desde su pestaña Entreno (se copian enteras y puedes ajustarlas sin tocar
        la plantilla).
      </p>
      <ul className="divide-y rounded-xl border">
        {(data ?? []).map((t) => {
          const block = t.workout_blocks[0];
          return (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="flex-1">
                {block ? (
                  <Link href={`/panel/biblioteca/plantillas/${block.id}`} className="font-medium hover:underline">
                    {t.name}
                  </Link>
                ) : (
                  <span className="font-medium">{t.name}</span>
                )}
                <span className="block text-xs text-muted-foreground">
                  {block?.workout_weeks.length ?? 0} semanas · creada {formatDate(t.created_at)}
                </span>
              </span>
              <DeleteTemplateButton templateId={t.id} />
            </li>
          );
        })}
        {!data?.length ? (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">Aún no hay plantillas.</li>
        ) : null}
      </ul>
      <NewTemplate />
    </div>
  );
}

function NewTemplate() {
  return (
    <div className="rounded-xl border p-4">
      <p className="mb-2 text-sm font-medium">Nueva plantilla</p>
      <NewTemplateForm />
    </div>
  );
}
