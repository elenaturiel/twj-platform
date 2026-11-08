import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/settings";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Suplementación honesta" };

export default async function SupplementsPage() {
  await requireClientWithAccess();
  const supabase = await createClient();
  const [{ data: links }, { data: disclaimer }] = await Promise.all([
    supabase.from("affiliate_links").select("id, label, description, code").eq("is_active", true).order("sort_order"),
    supabase.from("settings").select("value").eq("key", "nutrition.affiliate_disclaimer").maybeSingle(),
  ]);
  await getPublicSettings();
  return (
    <div className="space-y-4">
      <Link href="/comida" className="text-sm text-muted-foreground hover:underline">
        ← Comida
      </Link>
      <h1 className="text-3xl font-extrabold">Suplementación honesta</h1>
      <p className="text-sm text-muted-foreground">
        Primero la comida, el sueño y el entreno. Los suplementos son la guinda, no el pastel. Aquí solo lo que tiene
        evidencia.
      </p>
      {links?.length ? (
        <ul className="space-y-3">
          {links.map((l) => (
            <li key={l.id} className="space-y-2 rounded-2xl border p-4">
              <p className="font-semibold">{l.label}</p>
              {l.description ? <p className="text-sm">{l.description}</p> : null}
              {l.code ? (
                <p className="text-sm">
                  Código: <code className="rounded bg-muted px-1.5 py-0.5 font-semibold">{l.code}</code>
                </p>
              ) : null}
              <a
                href={`/api/r/${l.id}`}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-flex items-center gap-1 text-sm font-medium text-accent underline"
              >
                Ver en HSN <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Jaime aún no ha añadido recomendaciones." />
      )}
      <p className="rounded-lg bg-muted p-3 text-xs">{String(disclaimer?.value ?? "Enlaces de afiliado.")}</p>
    </div>
  );
}
