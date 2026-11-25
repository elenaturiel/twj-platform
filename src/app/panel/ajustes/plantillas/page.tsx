import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { TemplateEditor } from "@/features/config/template-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Plantillas de email" };

export default async function TemplatesPage() {
  await requireScope("settings");
  const supabase = await createClient();
  const { data } = await supabase
    .from("message_templates")
    .select("key, subject, body, variables, description, channel")
    .eq("channel", "email")
    .order("key");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/panel/ajustes" className="text-sm text-muted-foreground">
        ← Ajustes
      </Link>
      <h1 className="text-3xl font-extrabold">Plantillas de email</h1>
      <p className="text-sm text-muted-foreground">
        Textos de los emails automáticos. Los avisos del día a día (citas, chat, menús) usan el título y el texto del
        propio aviso.
      </p>
      {(data ?? []).map((t) => (
        <Card key={t.key}>
          <CardHeader>
            <CardTitle className="font-mono text-sm">{t.key}</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateEditor t={t} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
