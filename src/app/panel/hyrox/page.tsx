import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { CUANDO, getHyroxStats, NIVEL } from "@/features/hyrox/queries";
import { ContactsTable, EventForm, MailingForm } from "@/features/hyrox/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "HYROX" };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "–");

function Kpi({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Barras horizontales de una sola serie, con el valor escrito (sin leyenda). */
function Bars({ rows }: { rows: { label: string; value: number; total: number }[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Todavía no hay datos.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{r.label}</span>
            <span className="font-semibold tabular-nums">
              {r.value} <span className="font-normal text-muted-foreground">· {pct(r.value, r.total)}</span>
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: r.total ? `${(r.value / r.total) * 100}%` : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SourceTable({
  rows,
  first,
}: {
  rows: { nombre: string; visitas: number; empezaron: number; emails: number }[];
  first: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b text-xs text-muted-foreground">
        <tr>
          <th className="py-1.5 text-left font-medium">{first}</th>
          <th className="text-right font-medium">Visitas</th>
          <th className="text-right font-medium">Empez.</th>
          <th className="text-right font-medium">Emails</th>
          <th className="text-right font-medium">Conv.</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((r) => (
          <tr key={r.nombre}>
            <td className="py-1.5 font-medium">{r.nombre}</td>
            <td className="text-right tabular-nums">{r.visitas}</td>
            <td className="text-right tabular-nums">{r.empezaron}</td>
            <td className="text-right font-semibold tabular-nums">{r.emails}</td>
            <td className="text-right text-muted-foreground tabular-nums">{pct(r.emails, r.empezaron)}</td>
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-2 text-muted-foreground">
              Todavía no hay datos.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export default async function HyroxPanel() {
  await requireScope("clients");
  const supabase = await createClient();
  const [s, { data: events }, { data: mailings }] = await Promise.all([
    getHyroxStats(),
    supabase.from("hyrox_events").select("id, name, city, event_date, is_active").order("event_date"),
    supabase
      .from("hyrox_mailings")
      .select("id, subject, status, total, sent, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const funnel = [
    { label: "Paso 1 · nivel", value: s.pasos.paso1, total: s.empezaron },
    { label: "Paso 2 · plazo", value: s.pasos.paso2, total: s.empezaron },
    { label: "Envío · email", value: s.pasos.envio, total: s.empezaron },
  ];
  const dist = (d: Record<string, number>, names: Record<string, string>) => {
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    return Object.entries(d)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({ label: names[k] ?? k, value: v, total }));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Lista HYROX</h1>
        <p className="text-sm text-muted-foreground">
          Los datos llegan del formulario de la web (www.trainwithjaime.es/hyrox) y del de la app.
          {s.ultimo
            ? ` Último movimiento: ${new Date(s.ultimo).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}.`
            : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Visitas" value={s.visitas} hint="solo de quien acepta la analítica" />
        <Kpi label="Empezaron" value={s.empezaron} hint="respondieron al menos 1 paso" />
        <Kpi label="Emails" value={s.emails} hint="con consentimiento" />
        <Kpi label="Conversión" value={pct(s.emails, s.empezaron)} hint="emails / empezaron" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finalizados por paso</CardTitle>
          <CardDescription>
            Exacto (sale de las respuestas guardadas). Eventos registrados: vista {s.eventos.vista}, paso 1{" "}
            {s.eventos.paso1}, paso 2 {s.eventos.paso2}, envío {s.eventos.envio}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Bars rows={funnel} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emails ({s.contactos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactsTable rows={s.contactos} nivel={NIVEL} cuando={CUANDO} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Por ubicación del banner</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceTable rows={s.porUbicacion} first="Banner" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Por utm_source</CardTitle>
          </CardHeader>
          <CardContent>
            <SourceTable rows={s.porSource} first="Origen" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            <Bars rows={dist(s.nivel, NIVEL)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plazo</CardTitle>
          </CardHeader>
          <CardContent>
            <Bars rows={dist(s.cuando, CUANDO)} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email a la lista</CardTitle>
          <CardDescription>
            Se envía por tandas en los próximos minutos (necesita la clave de Resend para salir de verdad).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MailingForm nivel={NIVEL} cuando={CUANDO} />
          {mailings?.length ? (
            <ul className="divide-y rounded-xl border text-sm">
              {mailings.map((m) => (
                <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1">{m.subject}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {m.sent}/{m.total}
                  </span>
                  <Badge variant={m.status === "sent" ? "secondary" : "outline"}>
                    {m.status === "sent" ? "Enviado" : m.status === "sending" ? "Enviando" : "En cola"}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pruebas HYROX</CardTitle>
          <CardDescription>Las altas nuevas se asocian a la próxima prueba activa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(events ?? []).map((e) => (
            <EventForm key={e.id} e={e} />
          ))}
          <EventForm />
        </CardContent>
      </Card>
    </div>
  );
}
