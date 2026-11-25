import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { LegalEditor, PublishButton } from "@/features/config/legal-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Textos legales" };

const KINDS = [
  ["privacy", "Política de privacidad", "/legal/privacidad"],
  ["legal_notice", "Aviso legal", "/legal/aviso-legal"],
  ["terms", "Términos del servicio", "/legal/terminos"],
  ["cookies", "Política de cookies", "/legal/cookies"],
  ["health_data", "Consentimiento datos de salud", null],
  ["progress_photos", "Consentimiento fotos de progreso", null],
  ["marketing", "Consentimiento comunicaciones", null],
  ["guardian", "Autorización de tutor (menores)", null],
  ["health_screening", "Cuestionario de salud (PAR-Q)", null],
] as const;

export default async function LegalAdmin() {
  await requireScope("settings");
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("legal_documents")
    .select("id, kind, version, title, body_md, is_draft, published_at, created_at")
    .order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold">Textos legales</h1>
        <p className="text-sm text-muted-foreground">
          Pega aquí los textos revisados por vuestro asesor. Cada cambio es una versión nueva; al publicarla, los
          consentimientos nuevos quedan registrados con esa versión.
        </p>
      </div>
      {KINDS.map(([kind, label, href]) => {
        const versions = (docs ?? []).filter((d) => d.kind === kind);
        const live = versions.find((d) => !d.is_draft);
        const draft = versions.find((d) => d.is_draft);
        const base = draft ?? live;
        return (
          <Card key={kind}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {label}
                {live ? (
                  <Badge variant="secondary">Vigente: {live.version}</Badge>
                ) : (
                  <Badge variant="outline">Sin publicar</Badge>
                )}
                {draft ? <Badge variant="outline">Borrador: {draft.version}</Badge> : null}
              </CardTitle>
              {href ? (
                <CardDescription>
                  Página pública:{" "}
                  <a href={href} target="_blank" className="underline">
                    {href}
                  </a>
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {draft ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex-1">Hay un borrador ({draft.version}) sin publicar.</span>
                  <PublishButton id={draft.id} label={`${label} ${draft.version}`} />
                </div>
              ) : null}
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  {draft ? "Editar borrador" : "Nueva versión"}
                </summary>
                <div className="pt-3">
                  <LegalEditor
                    kind={kind}
                    initial={{ version: draft?.version ?? "", title: base?.title ?? label, body: base?.body_md ?? "" }}
                  />
                </div>
              </details>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
