import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentCardReview } from "@/features/clients/staff-forms";
import { formatDate } from "@/features/clients/ui";

export const metadata: Metadata = { title: "Pendientes" };

/** Bandeja única de cosas que esperan a Jaime/Elena. Crecerá con check-ins y cambios de menú. */
export default async function PendingPage() {
  await requireStaff();
  const supabase = await createClient();
  const [{ data: cards }, { data: leads }, { data: flags }, { data: pendingPay }] = await Promise.all([
    supabase
      .from("student_verifications")
      .select("id, client_id, card_path, created_at, clients(profiles(full_name))")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("leads")
      .select("id, name, email, phone, pack_weeks, event_name, event_date, message, created_at")
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
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-extrabold">Pendientes</h1>

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
