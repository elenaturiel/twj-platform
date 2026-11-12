/**
 * Catálogo de avisos que puede recibir cada perfil. Sirve para la pantalla de
 * preferencias: cada tipo se puede activar/desactivar por canal (email, push) y,
 * para el equipo, mandar al resumen diario en vez de al momento.
 */
export type NotificationAudience = "client" | "staff";
export type NotificationTypeInfo = {
  type: string;
  label: string;
  group: string;
  audience: NotificationAudience;
  critical?: boolean;
};

export const NOTIFICATION_TYPES: NotificationTypeInfo[] = [
  // Cliente
  { type: "chat_message", label: "Respuestas en el chat", group: "Chat", audience: "client" },
  { type: "appointment_booked", label: "Citas confirmadas", group: "Agenda", audience: "client" },
  { type: "appointment_reminder", label: "Recordatorio 24 h y 1 h antes", group: "Agenda", audience: "client" },
  { type: "appointment_moved", label: "Cambios de hora", group: "Agenda", audience: "client" },
  { type: "appointment_cancelled", label: "Citas canceladas", group: "Agenda", audience: "client" },
  { type: "session_summary", label: "Resumen de la sesión y objetivos", group: "Agenda", audience: "client" },
  { type: "plan_updated", label: "Plan de entreno actualizado", group: "Entreno", audience: "client" },
  { type: "checkin_due", label: "Check-in pendiente", group: "Seguimiento", audience: "client" },
  { type: "checkin_reviewed", label: "Respuesta a tu check-in", group: "Seguimiento", audience: "client" },
  { type: "menu_published", label: "Menú de la semana publicado", group: "Comida", audience: "client" },
  { type: "meal_change_answered", label: "Respuesta a cambios de menú", group: "Comida", audience: "client" },
  { type: "renewal_upcoming", label: "Próxima renovación", group: "Pagos", audience: "client", critical: true },
  { type: "payment_failed", label: "Pago fallido", group: "Pagos", audience: "client", critical: true },
  { type: "extra_session_paid", label: "Sesión extra pagada", group: "Pagos", audience: "client" },
  {
    type: "guardian_reviewed",
    label: "Autorización del tutor revisada",
    group: "Cuenta",
    audience: "client",
    critical: true,
  },
  // Equipo
  { type: "chat_message", label: "Mensajes de clientes", group: "Chat", audience: "staff" },
  { type: "new_signup", label: "Altas nuevas", group: "Clientes", audience: "staff" },
  { type: "onboarding_completed", label: "Fichas completadas", group: "Clientes", audience: "staff" },
  { type: "client_profile_changed", label: "Cambios en la ficha de un cliente", group: "Clientes", audience: "staff" },
  { type: "client_cancelled", label: "Bajas", group: "Clientes", audience: "staff" },
  { type: "guardian_confirmed", label: "Tutor legal confirmado", group: "Clientes", audience: "staff" },
  {
    type: "guardian_document_uploaded",
    label: "Autorizaciones de menores por revisar",
    group: "Clientes",
    audience: "staff",
  },
  { type: "peak_application", label: "Solicitudes de Peak", group: "Clientes", audience: "staff" },
  { type: "student_card_uploaded", label: "Carnés de estudiante", group: "Clientes", audience: "staff" },
  { type: "workout_completed", label: "Entrenos registrados y récords", group: "Entreno", audience: "staff" },
  { type: "checkin_submitted", label: "Check-ins recibidos", group: "Seguimiento", audience: "staff" },
  { type: "meal_change_requested", label: "Peticiones de cambio de menú", group: "Comida", audience: "staff" },
  { type: "day_note", label: "Notas del día de clientes", group: "Comida", audience: "staff" },
  { type: "appointment_booked", label: "Reservas de clientes", group: "Agenda", audience: "staff" },
  { type: "appointment_moved", label: "Citas movidas", group: "Agenda", audience: "staff" },
  { type: "appointment_cancelled", label: "Citas canceladas", group: "Agenda", audience: "staff" },
  { type: "payment_received", label: "Pagos recibidos", group: "Pagos", audience: "staff" },
  { type: "payment_failed", label: "Pagos fallidos", group: "Pagos", audience: "staff", critical: true },
];

export function typesFor(audience: NotificationAudience) {
  return NOTIFICATION_TYPES.filter((t) => t.audience === audience);
}

export type PreferenceRow = { type: string; channel: "email" | "push"; enabled: boolean; digest: boolean };

/** Estado efectivo de un tipo y canal: preferencia concreta > comodín '*' > activado. */
export function effectivePreference(rows: PreferenceRow[], type: string, channel: "email" | "push") {
  const specific = rows.find((r) => r.type === type && r.channel === channel);
  const wildcard = rows.find((r) => r.type === "*" && r.channel === channel);
  return {
    enabled: specific?.enabled ?? wildcard?.enabled ?? true,
    digest: specific?.digest ?? wildcard?.digest ?? false,
  };
}
