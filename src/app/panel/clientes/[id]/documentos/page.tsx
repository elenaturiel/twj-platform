import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/features/clients/ui";

const KIND_LABELS: Record<string, string> = {
  terms: "Términos",
  privacy: "Privacidad",
  health_data: "Datos de salud (art. 9)",
  progress_photos: "Fotos de progreso",
  marketing: "Comunicaciones comerciales",
  cookies: "Cookies",
  guardian: "Autorización del tutor",
};

export default async function ClientDocuments({ params }: PageProps<"/panel/clientes/[id]/documentos">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("profile_id").eq("id", id).single();
  const [{ data: consents }, { data: docs }] = await Promise.all([
    supabase
      .from("consents")
      .select("id, kind, granted, document_version, ip, created_at")
      .eq("profile_id", client?.profile_id ?? "")
      .order("created_at", { ascending: false }),
    supabase.from("documents").select("id, title, kind, created_at").eq("client_id", id),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consentimientos (registro completo)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(consents ?? []).map((c) => (
              <li key={c.id} className="py-2">
                <p>
                  <strong>{KIND_LABELS[c.kind] ?? c.kind}</strong>: {c.granted ? "Sí" : "No"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(c.created_at, true)} · versión {c.document_version} · IP {c.ip ? String(c.ip) : "—"}
                </p>
              </li>
            ))}
            {!consents?.length ? (
              <li className="py-2 text-muted-foreground">Sin consentimientos registrados.</li>
            ) : null}
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {(docs ?? []).length ? (
            <ul className="divide-y">
              {docs!.map((d) => (
                <li key={d.id} className="py-2">
                  {d.title} <span className="text-xs text-muted-foreground">({formatDate(d.created_at)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Sin documentos. La subida de documentos llega en la Fase 8.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
