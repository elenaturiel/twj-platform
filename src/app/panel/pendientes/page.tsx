import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentCardReview } from "@/features/clients/staff-forms";
import { formatDate } from "@/features/clients/ui";
import { AccessRequestRow } from "@/features/clients/access-requests";
import { todayInMadrid } from "@/lib/dates";
import { DownloadConsentButton, GuardianReview, OpenDocumentButton } from "@/features/minors/staff-ui";
import { KIND_LABELS, OPEN_STATUSES, type ContactKind, type ContactStatus } from "@/domain/contacts/contacts";

export const metadata: Metadata = { title: "Pendientes" };

/** Bandeja única de cosas que esperan a Jaime/Elena. Crecerá con check-ins y cambios de menú. */
export default async function PendingPage() {
  await requireStaff();
  const supabase = await createClient();
  const [
    { data: cards },
    { data: leads },
    { data: flags },
    { data: pendingPay },
    { data: checkins },
    { data: requests },
    { data: plans },
    { data: followups },
    { data: minors },
    { count: guardianText },
  ] = await Promise.all([
    supabase
      .from("student_verifications")
      .select("id, client_id, card_path, created_at, clients(profiles(full_name))")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("leads")
      .select("id, name, email, phone, pack_weeks, event_name, event_date, message, created_at")
      .eq("kind", "peak_application")
      .in("status", ["new", "contacted"])
      .order("created_at", { ascending: false }),
    supabase
      .from("health_screenings")
      .select("id, client_id, created_at, clients(profiles(full_name))")
      .eq("has_flags", true)
      .is("reviewed_at", null),
    supabase
      .from("clients")
      .select("id, created_at, billing_mode, profiles(full_name), plans(name)")
      .eq("status", "pending_payment")
      .eq("billing_mode", "manual"),
    supabase
      .from("checkins")
      .select("id, client_id, due_on, submitted_at, clients(profiles(full_name))")
      .eq("status", "submitted")
      .order("submitted_at"),
    supabase
      .from("leads")
      .select("id, name, email, phone, message, answers, created_at")
      .eq("kind", "access_request")
      .in("status", ["new", "contacted"])
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("key, name"),
    supabase
      .from("contacts")
      .select("id, full_name, kind, next_followup_on")
      .in("status", OPEN_STATUSES as ContactStatus[])
      .lte("next_followup_on", todayInMadrid())
      .order("next_followup_on"),
    supabase
      .from("clients")
      .select("id, profiles(full_name), documents(kind, storage_path, created_at)")
      .eq("guardian_status", "pending")
      .order("created_at"),
    supabase
      .from("legal_documents")
      .select("id", { count: "exact", head: true })
      .eq("kind", "guardian")
      .eq("is_draft", false)
      .not("published_at", "is", null),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-extrabold">Pendientes</h1>

      {minors?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Autorizaciones de menores ({minors.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {!guardianText ? (
              <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                Falta el texto de la autorización: el PDF sale sin él. Publícalo en{" "}
                <Link href="/panel/legal" className="underline">
                  Textos legales → Autorización de tutor (menores)
                </Link>{" "}
                (revisado por tu asesor).
              </p>
            ) : null}
            <ul className="divide-y">
              {minors.map((m) => {
                const doc = (m.documents ?? [])
                  .filter((d) => d.kind === "guardian")
                  .sort((a, z) => a.created_at.localeCompare(z.created_at))
                  .at(-1);
                return (
                  <li key={m.id} className="space-y-2 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/panel/clientes/${m.id}/documentos`} className="font-medium hover:underline">
                        {m.profiles?.full_name ?? "Cliente"}
                      </Link>
                      <span className="text-muted-foreground">
                        {doc
                          ? `Firmada y subida el ${formatDate(doc.created_at)}`
                          : "Esperando la autorización firmada"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc ? (
                        <OpenDocumentButton clientId={m.id} path={doc.storage_path} label="Ver autorización" />
                      ) : null}
                      {!doc ? <DownloadConsentButton clientId={m.id} /> : null}
                    </div>
                    <GuardianReview clientId={m.id} hasDocument={Boolean(doc)} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {followups?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contactos a los que escribir hoy ({followups.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {followups.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/panel/contactos/${c.id}`} className="font-medium hover:underline">
                    {c.full_name}
                  </Link>
                  <span className="text-muted-foreground">
                    {KIND_LABELS[c.kind as ContactKind]} · {formatDate(c.next_followup_on)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check-ins por revisar ({checkins?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {checkins?.length ? (
            <ul className="divide-y text-sm">
              {checkins.map((c) => (
                <li key={c.id} className="flex justify-between py-2">
                  <Link href={`/panel/clientes/${c.client_id}/checkins`} className="font-medium hover:underline">
                    {c.clients?.profiles?.full_name}
                  </Link>
                  <span className="text-xs text-muted-foreground">enviado {formatDate(c.submitted_at, true)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Todo revisado." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carnés universitarios por revisar ({cards?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cards?.length ? (
            cards.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0">
                <Link href={`/panel/clientes/${c.client_id}/pagos`} className="font-medium hover:underline">
                  {c.clients?.profiles?.full_name}{" "}
                  <span className="text-xs text-muted-foreground">({formatDate(c.created_at)})</span>
                </Link>
                <StudentCardReview verificationId={c.id} clientId={c.client_id} path={c.card_path} />
              </div>
            ))
          ) : (
            <EmptyState title="Nada que revisar." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitudes de plaza ({requests?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests?.length ? (
            <ul className="divide-y">
              {requests.map((r) => {
                const plan = ((r.answers as { plan?: string | null } | null)?.plan ?? null) as string | null;
                return (
                  <AccessRequestRow
                    key={r.id}
                    planName={plans?.find((p) => p.key === plan)?.name ?? null}
                    r={{
                      id: r.id,
                      name: r.name,
                      email: String(r.email),
                      phone: r.phone,
                      message: r.message,
                      plan,
                      created: formatDate(r.created_at, true),
                    }}
                  />
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Nadie esperando plaza." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solicitudes Peak ({leads?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {leads?.length ? (
            <ul className="divide-y text-sm">
              {leads.map((l) => (
                <li key={l.id} className="space-y-1 py-3">
                  <p className="font-medium">
                    {l.name} ·{" "}
                    <a className="underline" href={`mailto:${l.email}`}>
                      {l.email}
                    </a>{" "}
                    {l.phone ? `· ${l.phone}` : ""}
                  </p>
                  <p>
                    {l.event_name} {l.event_date ? `(${formatDate(l.event_date)})` : ""} · {l.pack_weeks} semanas
                  </p>
                  {l.message ? <p className="whitespace-pre-line text-muted-foreground">{l.message}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(l.created_at, true)} · Para darle de alta: Clientes → Nuevo cliente (plan Peak, importe
                    pactado).
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin solicitudes nuevas." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuestionarios de salud con algún «sí» ({flags?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {flags?.length ? (
            <ul className="divide-y text-sm">
              {flags.map((f) => (
                <li key={f.id} className="py-2">
                  <Link href={`/panel/clientes/${f.client_id}/ficha`} className="hover:underline">
                    {f.clients?.profiles?.full_name}
                  </Link>{" "}
                  <span className="text-xs text-muted-foreground">{formatDate(f.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Ninguno." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Altas manuales esperando el primer pago ({pendingPay?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingPay?.length ? (
            <ul className="divide-y text-sm">
              {pendingPay.map((c) => (
                <li key={c.id} className="py-2">
                  <Link href={`/panel/clientes/${c.id}/pagos`} className="hover:underline">
                    {c.profiles?.full_name} · {c.plans?.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Ninguna." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
