import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/features/clients/ui";
import {
  DownloadConsentButton,
  GuardianReview,
  OpenDocumentButton,
  StaffDocumentUpload,
} from "@/features/minors/staff-ui";

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
  const { data: client } = await supabase
    .from("clients")
    .select("profile_id, is_minor, guardian_status")
    .eq("id", id)
    .single();
  const minorPending = client?.guardian_status === "pending";
  const [{ data: consents }, { data: docs }] = await Promise.all([
    supabase
      .from("consents")
      .select("id, kind, granted, document_version, ip, created_at")
      .eq("profile_id", client?.profile_id ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id, title, kind, storage_path, visible_to_client, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const hasGuardianDoc = (docs ?? []).some((d) => d.kind === "guardian");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {client?.is_minor ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Autorización del tutor (menor de edad)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {client.guardian_status === "confirmed" ? (
              <p className="text-success">Aprobada: puede entrenar.</p>
            ) : hasGuardianDoc ? (
              <p>Ha llegado la autorización firmada. Revísala y apruébala para que pueda empezar.</p>
            ) : (
              <p>
                Falta la autorización firmada. Hasta que la apruebes no puede entrenar. Si te la mandan por WhatsApp,
                súbela abajo como «Autorización del tutor».
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <DownloadConsentButton clientId={id} />
            </div>
            {minorPending ? <GuardianReview clientId={id} hasDocument={hasGuardianDoc} /> : null}
          </CardContent>
        </Card>
      ) : null}
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
                <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {d.title}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({formatDate(d.created_at)}
                      {d.visible_to_client ? "" : " · solo equipo"})
                    </span>
                  </span>
                  <OpenDocumentButton clientId={id} path={d.storage_path} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Sin documentos.</p>
          )}
          <div className="mt-4 border-t pt-4">
            <StaffDocumentUpload clientId={id} minorPending={minorPending} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
