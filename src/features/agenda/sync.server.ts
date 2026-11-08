import "server-only";
import { formatSlot } from "@/domain/agenda/slots";
import { createCalendarEvent, deleteCalendarEvent, moveCalendarEvent } from "@/lib/google/calendar";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Efectos de una cita fuera de la BD: evento en Google Calendar (con Meet si es
 * online), enlace de respaldo y avisos. Nunca hace fallar la reserva: si Google
 * no responde, la cita queda confirmada y se usa el enlace fijo de ajustes.
 */
export async function afterBooking(appointmentId: string, by: "client" | "staff") {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("appointments")
    .select(
      "id, client_id, starts_at, ends_at, modality, location, client_notes, appointment_types(name), clients(profile_id, profiles(full_name, email))",
    )
    .eq("id", appointmentId)
    .single();
  if (!a) return;
  const typeName = a.appointment_types?.name ?? "Cita";
  const name = a.clients?.profiles?.full_name ?? "Cliente";
  const online = a.modality === "online";

  const ev = await createCalendarEvent({
    appointmentId: a.id,
    title: `${typeName} · ${name} (TWJ)`,
    description: a.client_notes ? `Nota del cliente: ${a.client_notes}` : "Reservada desde la app de Train with Jaime.",
    start: a.starts_at,
    end: a.ends_at,
    attendeeEmail: a.clients?.profiles?.email ?? null,
    withMeet: online,
    location: a.location,
  });
  let meetUrl = ev?.meetUrl ?? null;
  if (online && !meetUrl) {
    const { data: s } = await admin
      .from("settings")
      .select("value")
      .eq("key", "agenda.fallback_meet_url")
      .maybeSingle();
    meetUrl = typeof s?.value === "string" && s.value.startsWith("https://") ? s.value : null;
  }
  if (ev || meetUrl)
    await admin
      .from("appointments")
      .update({ google_event_id: ev?.eventId ?? null, meet_url: meetUrl })
      .eq("id", a.id);

  const when = formatSlot(a.starts_at);
  const link = online
    ? meetUrl
      ? `Enlace: ${meetUrl}`
      : "Jaime te enviará el enlace de la videollamada."
    : `Lugar: ${a.location ?? "por confirmar"}`;
  if (a.clients?.profile_id) {
    await admin.rpc("notify", {
      p_profile_id: a.clients.profile_id,
      p_type: "appointment_booked",
      p_title: `${typeName} confirmada: ${when}`,
      p_body: by === "staff" ? `Jaime te ha agendado una cita. ${link}` : link,
      p_link: "/agenda",
      p_client_id: a.client_id,
    });
  }
  if (by === "client") {
    await admin.rpc("notify_staff", {
      p_type: "appointment_booked",
      p_title: `${name} ha reservado ${typeName.toLowerCase()}`,
      p_body: when,
      p_link: "/panel/agenda",
      p_client_id: a.client_id,
    });
  }
}

export async function afterReschedule(appointmentId: string, by: "client" | "staff") {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("appointments")
    .select(
      "id, client_id, starts_at, ends_at, google_event_id, appointment_types(name), clients(profile_id, profiles(full_name))",
    )
    .eq("id", appointmentId)
    .single();
  if (!a) return;
  if (a.google_event_id) await moveCalendarEvent(a.google_event_id, a.starts_at, a.ends_at);
  const typeName = a.appointment_types?.name ?? "Cita";
  const when = formatSlot(a.starts_at);
  if (by === "client") {
    await admin.rpc("notify_staff", {
      p_type: "appointment_moved",
      p_title: `${a.clients?.profiles?.full_name ?? "Un cliente"} ha movido ${typeName.toLowerCase()}`,
      p_body: `Nueva hora: ${when}`,
      p_link: "/panel/agenda",
      p_client_id: a.client_id,
    });
  } else if (a.clients?.profile_id) {
    await admin.rpc("notify", {
      p_profile_id: a.clients.profile_id,
      p_type: "appointment_moved",
      p_title: `${typeName}: cambio de hora`,
      p_body: `Nueva hora: ${when}`,
      p_link: "/agenda",
      p_client_id: a.client_id,
    });
  }
}

export async function afterCancel(appointmentId: string, by: "client" | "staff", refunded: boolean) {
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("appointments")
    .select(
      "id, client_id, starts_at, google_event_id, cancel_reason, appointment_types(name), clients(profile_id, profiles(full_name))",
    )
    .eq("id", appointmentId)
    .single();
  if (!a) return;
  if (a.google_event_id) await deleteCalendarEvent(a.google_event_id);
  const typeName = a.appointment_types?.name ?? "Cita";
  const when = formatSlot(a.starts_at);
  if (by === "client") {
    await admin.rpc("notify_staff", {
      p_type: "appointment_cancelled",
      p_title: `${a.clients?.profiles?.full_name ?? "Un cliente"} ha cancelado ${typeName.toLowerCase()}`,
      p_body: `${when}${refunded ? "" : " · fuera de plazo (sin devolución)"}${a.cancel_reason ? ` · ${a.cancel_reason}` : ""}`,
      p_link: "/panel/agenda",
      p_client_id: a.client_id,
    });
  } else if (a.clients?.profile_id) {
    await admin.rpc("notify", {
      p_profile_id: a.clients.profile_id,
      p_type: "appointment_cancelled",
      p_title: `${typeName} cancelada`,
      p_body: `${when}${refunded ? " · te hemos devuelto el crédito" : ""}${a.cancel_reason ? ` · ${a.cancel_reason}` : ""}`,
      p_link: "/agenda",
      p_client_id: a.client_id,
    });
  }
}

/** Mensaje de error legible a partir de los `raise exception` de la BD. */
export function bookingError(message: string | undefined): string {
  if (!message) return "No se ha podido reservar.";
  const known = [
    "Ese hueco ya no está disponible",
    "No te quedan créditos",
    "Hay que reservar con",
    "Tu plan",
    "Disponible a partir",
    "Este tipo de cita",
    "Faltan menos de",
    "La cita ya",
    "Cita no encontrada",
    "Tipo de cita no disponible",
  ];
  return known.some((k) => message.startsWith(k)) ? message : "No se ha podido completar. Prueba otra vez.";
}
