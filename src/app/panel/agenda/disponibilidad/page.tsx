import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2 } from "lucide-react";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { googleConfigured } from "@/lib/google/calendar";
import { formatSlot } from "@/domain/agenda/slots";
import { getAgendaSettings, getAppointmentTypes, getAvailability } from "@/features/agenda/queries";
import { deleteException, disconnectGoogle } from "@/features/agenda/staff-actions";
import {
  AgendaSettingsForm,
  ExceptionForm,
  TypeEditor,
  WeeklyAvailability,
} from "@/features/agenda/ui/availability-editor";
import { DeleteButton } from "@/features/agenda/ui/staff-agenda";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Disponibilidad" };

const GOOGLE_MSG: Record<string, string> = {
  ok: "Google Calendar conectado: las nuevas citas online llevarán su enlace de Meet.",
  error: "No se ha podido conectar con Google. Prueba otra vez.",
  "sin-configurar": "Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en el servidor.",
};

export default async function AvailabilityPage({ searchParams }: PageProps<"/panel/agenda/disponibilidad">) {
  await requireScope("clients");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ rules, exceptions }, types, settings, { data: google }] = await Promise.all([
    getAvailability(),
    getAppointmentTypes(),
    getAgendaSettings(),
    supabase.from("google_connections").select("google_email, connected_at").limit(1).maybeSingle(),
  ]);
  const configured = googleConfigured();
  const msg = typeof sp.google === "string" ? GOOGLE_MSG[sp.google] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/panel/agenda" className="text-sm text-muted-foreground">
        ← Agenda
      </Link>
      <h1 className="text-3xl font-extrabold">Disponibilidad</h1>
      {msg ? <p className="rounded-xl bg-muted p-3 text-sm">{msg}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="size-5" aria-hidden /> Google Calendar y Meet
          </CardTitle>
          <CardDescription>
            Con Google conectado, cada cita crea un evento en tu calendario con enlace de Meet, se mueve o se borra
            sola, y los huecos ocupados en tu calendario no se ofrecen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {google ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Conectado</Badge>
              <span className="text-sm">{google.google_email}</span>
              <form
                action={async () => {
                  "use server";
                  await disconnectGoogle();
                }}
              >
                <Button size="sm" variant="ghost" className="text-destructive">
                  Desconectar
                </Button>
              </form>
            </div>
          ) : configured ? (
            <Button asChild>
              <a href="/api/google/connect">Conectar Google Calendar</a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pendiente: hacen falta las credenciales de Google (GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET). Mientras
              tanto se usa el enlace fijo de abajo.
            </p>
          )}
          <AgendaSettingsForm fallbackMeetUrl={settings.fallbackMeetUrl} horizonDays={settings.horizonDays} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horario semanal</CardTitle>
          <CardDescription>Hora de Madrid. Los clientes solo ven huecos dentro de estas franjas.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyAvailability initial={rules} types={types.map((t) => ({ key: t.key, name: t.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excepciones</CardTitle>
          <CardDescription>Vacaciones y días sin citas, o huecos extra puntuales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exceptions.length ? (
            <ul className="divide-y rounded-xl border">
              {exceptions.map((x) => (
                <li key={x.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Badge variant={x.kind === "blocked" ? "outline" : "secondary"}>
                    {x.kind === "blocked" ? "Bloqueo" : "Extra"}
                  </Badge>
                  <span className="flex-1 first-letter:uppercase">
                    {formatSlot(x.starts_at)} → {formatSlot(x.ends_at)}
                    {x.reason ? ` · ${x.reason}` : ""}
                  </span>
                  <DeleteButton onDelete={deleteException.bind(null, x.id)} label="Quitar excepción" />
                </li>
              ))}
            </ul>
          ) : null}
          <ExceptionForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de cita</CardTitle>
          <CardDescription>
            Qué gasta cada una lo define el plan: directo (MVP/Peak), videollamada mensual (desde All In), sesión extra
            comprada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {types.map((t) => (
            <TypeEditor key={t.key} t={t} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
