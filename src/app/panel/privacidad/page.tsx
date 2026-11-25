import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { RequestActions } from "@/features/privacy/ui/staff";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Privacidad (RGPD)" };

const ACTIONS: Record<string, string> = {
  insert: "Alta",
  update: "Cambio",
  delete: "Borrado",
  anonymize: "Anonimizado",
  view: "Consulta",
  signed_url: "Archivo abierto",
};

export default async function PrivacyAdmin({ searchParams }: PageProps<"/panel/privacidad">) {
  const viewer = await requireScope("team");
  const sp = await searchParams;
  const entity = typeof sp.entidad === "string" ? sp.entidad : null;
  const supabase = await createClient();
  const [{ data: requests }, { data: retention }, { data: audit }, { data: actors }] = await Promise.all([
    supabase
      .from("data_requests")
      .select(
        "id, kind, status, reason, created_at, processed_at, notes, profiles!data_requests_profile_id_fkey(full_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("settings").select("value").eq("key", "privacy.retention_months_after_cancel").maybeSingle(),
    viewer.role === "owner"
      ? (() => {
          let q = supabase
            .from("audit_log")
            .select("id, actor_id, action, entity, entity_id, client_id, metadata, created_at")
            .order("created_at", { ascending: false })
            .limit(200);
          if (entity) q = q.eq("entity", entity);
          return q;
        })()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name").in("role", ["owner", "admin"]),
  ]);
  const actorName = new Map((actors ?? []).map((a) => [a.id, a.full_name]));
  const pending = (requests ?? []).filter((r) => r.status === "pending" && r.kind === "delete");
  const entities = [...new Set((audit ?? []).map((a) => a.entity))].sort();

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-3xl font-extrabold">Privacidad (RGPD)</h1>
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de eliminación</CardTitle>
          <CardDescription>
            La ley da un mes para responder. Anonimizar borra datos personales, de salud, fotos y mensajes; los pagos se
            conservan por obligación fiscal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length ? (
            <ul className="divide-y rounded-xl border">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1">
                    <span className="font-medium">{r.profiles?.full_name}</span>{" "}
                    <span className="text-muted-foreground">· {r.profiles?.email}</span>
                    <span className="block text-xs text-muted-foreground">
                      Pedido el {new Date(r.created_at).toLocaleDateString("es-ES")}
                      {r.reason ? ` · “${r.reason}”` : ""}
                    </span>
                  </span>
                  <RequestActions id={r.id} name={r.profiles?.full_name ?? "este cliente"} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Conservación: los clientes dados de baja se anonimizan solos a los{" "}
            {typeof retention?.value === "number" ? retention.value : 24} meses (cron «privacy»). Se cambia en Ajustes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(requests ?? [])
              .filter((r) => r.status !== "pending")
              .map((r) => (
                <li key={r.id} className="flex items-center gap-2 py-1.5">
                  <Badge variant="outline">{r.kind === "export" ? "Descarga" : "Eliminación"}</Badge>
                  <span className="flex-1">{r.profiles?.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.status === "done" ? "Hecha" : "Rechazada"} ·{" "}
                    {new Date(r.processed_at ?? r.created_at).toLocaleDateString("es-ES")}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </span>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>

      {audit ? (
        <Card>
          <CardHeader>
            <CardTitle>Registro de actividad</CardTitle>
            <CardDescription>Cambios en datos sensibles y accesos del equipo a archivos (últimos 200).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/panel/privacidad" className={!entity ? "font-bold underline" : "underline"}>
                Todo
              </Link>
              {entities.map((e) => (
                <Link
                  key={e}
                  href={`/panel/privacidad?entidad=${e}`}
                  className={entity === e ? "font-bold underline" : "underline"}
                >
                  {e}
                </Link>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Cuándo</th>
                    <th className="font-medium">Quién</th>
                    <th className="font-medium">Qué</th>
                    <th className="font-medium">Dónde</th>
                    <th className="font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {audit.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="py-1 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                      </td>
                      <td>{a.actor_id ? (actorName.get(a.actor_id) ?? "Cliente") : "Sistema"}</td>
                      <td>{ACTIONS[a.action] ?? a.action}</td>
                      <td>
                        {a.entity}
                        {a.client_id ? (
                          <Link
                            href={`/panel/clientes/${a.client_id}`}
                            className="ml-1 text-muted-foreground underline"
                          >
                            ficha
                          </Link>
                        ) : null}
                      </td>
                      <td
                        className="max-w-xs truncate text-xs text-muted-foreground"
                        title={JSON.stringify(a.metadata)}
                      >
                        {Object.keys((a.metadata as Record<string, unknown>) ?? {})
                          .slice(0, 4)
                          .join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
