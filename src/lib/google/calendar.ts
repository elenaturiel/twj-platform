import "server-only";
import { serverEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Google Calendar + Meet para la cuenta de Jaime (el owner que conecte su Google).
 * Si no hay credenciales o no está conectado, todas las funciones devuelven null
 * y la agenda sigue funcionando (enlace fijo de ajustes o "Jaime te enviará el enlace").
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "email",
];

export function googleConfigured() {
  const e = serverEnv();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}

export function googleAuthUrl(redirectUri: string, state: string) {
  const p = new URLSearchParams({
    client_id: serverEnv().GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const e = serverEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: e.GOOGLE_CLIENT_ID ?? "",
      client_secret: e.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}`);
  return (await res.json()) as { access_token: string; refresh_token?: string; id_token?: string };
}

/** Intercambia el código del consentimiento y guarda el refresh token en Vault. */
export async function completeGoogleConnection(profileId: string, code: string, redirectUri: string) {
  const t = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri });
  if (!t.refresh_token) throw new Error("Google no devolvió refresh token");
  let email: string | null = null;
  if (t.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(t.id_token.split(".")[1]!, "base64url").toString()) as { email?: string };
      email = payload.email ?? null;
    } catch {
      email = null;
    }
  }
  const { error } = await createAdminClient().rpc("google_store_token", {
    p_profile: profileId,
    p_email: email ?? "",
    p_token: t.refresh_token,
  });
  if (error) throw new Error(error.message);
  return email;
}

type Conn = { accessToken: string; calendarId: string };

/** Conexión del calendario de la agenda (el primer staff conectado: normalmente Jaime). */
async function connection(): Promise<Conn | null> {
  if (!googleConfigured()) return null;
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("google_connections")
    .select("profile_id, calendar_id")
    .order("connected_at")
    .limit(1)
    .maybeSingle();
  if (!conn) return null;
  const { data: refresh } = await admin.rpc("google_get_token", { p_profile: conn.profile_id });
  if (!refresh) return null;
  try {
    const t = await tokenRequest({ refresh_token: refresh as string, grant_type: "refresh_token" });
    return { accessToken: t.access_token, calendarId: conn.calendar_id };
  } catch (e) {
    console.error("[google] no se pudo refrescar el token", e);
    return null;
  }
}

async function gcal(conn: Conn, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok && res.status !== 410 && res.status !== 404)
    throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
  return res.status === 204 || res.status === 404 || res.status === 410 ? null : res.json();
}

export type CalendarEventInput = {
  appointmentId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  attendeeEmail: string | null;
  withMeet: boolean;
  location?: string | null;
};

/** Crea el evento (con Meet si es online). Devuelve null si Google no está disponible. */
export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<{ eventId: string; meetUrl: string | null } | null> {
  const conn = await connection();
  if (!conn) return null;
  try {
    const body = {
      summary: input.title,
      description: input.description,
      location: input.location ?? undefined,
      start: { dateTime: input.start, timeZone: "Europe/Madrid" },
      end: { dateTime: input.end, timeZone: "Europe/Madrid" },
      attendees: input.attendeeEmail ? [{ email: input.attendeeEmail }] : [],
      extendedProperties: { private: { twj_appointment: input.appointmentId } },
      ...(input.withMeet
        ? {
            conferenceData: {
              createRequest: { requestId: input.appointmentId, conferenceSolutionKey: { type: "hangoutsMeet" } },
            },
          }
        : {}),
    };
    const ev = (await gcal(
      conn,
      `/calendars/${encodeURIComponent(conn.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    )) as { id: string; hangoutLink?: string } | null;
    return ev ? { eventId: ev.id, meetUrl: ev.hangoutLink ?? null } : null;
  } catch (e) {
    console.error("[google] crear evento", e);
    return null;
  }
}

export async function moveCalendarEvent(eventId: string, start: string, end: string) {
  const conn = await connection();
  if (!conn) return;
  try {
    await gcal(
      conn,
      `/calendars/${encodeURIComponent(conn.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        method: "PATCH",
        body: JSON.stringify({
          start: { dateTime: start, timeZone: "Europe/Madrid" },
          end: { dateTime: end, timeZone: "Europe/Madrid" },
        }),
      },
    );
  } catch (e) {
    console.error("[google] mover evento", e);
  }
}

export async function deleteCalendarEvent(eventId: string) {
  const conn = await connection();
  if (!conn) return;
  try {
    await gcal(
      conn,
      `/calendars/${encodeURIComponent(conn.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: "DELETE" },
    );
  } catch (e) {
    console.error("[google] borrar evento", e);
  }
}

/** Ocupado en el calendario personal de Jaime (para no ofrecer esos huecos). */
export async function googleBusy(from: string, to: string): Promise<{ starts_at: string; ends_at: string }[]> {
  const conn = await connection();
  if (!conn) return [];
  try {
    const r = (await gcal(conn, "/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin: from, timeMax: to, timeZone: "Europe/Madrid", items: [{ id: conn.calendarId }] }),
    })) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> } | null;
    const busy = r?.calendars?.[conn.calendarId]?.busy ?? [];
    return busy.map((b) => ({ starts_at: b.start, ends_at: b.end }));
  } catch (e) {
    console.error("[google] freebusy", e);
    return [];
  }
}
