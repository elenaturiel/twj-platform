import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DOCS = {
  privacidad: { kind: "privacy", title: "Política de privacidad" },
  "aviso-legal": { kind: "legal_notice", title: "Aviso legal" },
  terminos: { kind: "terms", title: "Términos del servicio" },
  cookies: { kind: "cookies", title: "Política de cookies" },
} as const;

type Slug = keyof typeof DOCS;

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: DOCS[slug as Slug]?.title ?? "Legal" };
}

/** Textos legales versionados (tabla legal_documents, editables en el panel). */
export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const doc = DOCS[slug as Slug];
  if (!doc) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("legal_documents")
    .select("title, version, body_md, published_at")
    .eq("kind", doc.kind)
    .eq("is_draft", false)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
      <h1 className="text-3xl font-extrabold">{data?.title ?? doc.title}</h1>
      {data ? (
        <>
          <p className="text-xs text-muted-foreground">Versión {data.version}</p>
          <article className="leading-relaxed whitespace-pre-line">{data.body_md}</article>
        </>
      ) : (
        <p className="rounded-lg bg-warning/15 p-4 text-sm">
          {/* TODO(legal): textos definitivos revisados por un profesional (Fase 8). */}
          Texto en preparación. Debe redactarlo y revisarlo un profesional antes de la salida a producción. Mientras
          tanto, para cualquier duda sobre tus datos escribe a trainwithjaimesanz@gmail.com.
        </p>
      )}
    </main>
  );
}
