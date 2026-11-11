/**
 * Contactos de seguimiento: gente con la que Jaime habla (llamadas de onboarding,
 * asesorías gratis, colaboraciones) y que puede acabar siendo cliente… o no.
 */

export const CONTACT_KINDS = ["onboarding_call", "free_consult", "collaboration", "other"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const CONTACT_STATUSES = ["pending", "scheduled", "done", "thinking", "client", "not_now", "lost"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const KIND_LABELS: Record<ContactKind, string> = {
  onboarding_call: "Llamada de onboarding",
  free_consult: "Asesoría gratis",
  collaboration: "Colaboración",
  other: "Otro",
};

export const STATUS_LABELS: Record<ContactStatus, string> = {
  pending: "Pendiente de contactar",
  scheduled: "Llamada agendada",
  done: "Llamada hecha",
  thinking: "Se lo está pensando",
  client: "Es cliente",
  not_now: "Ahora no",
  lost: "No sigue",
};

export const EXPERIENCE_LABELS = {
  none: "Nunca ha entrenado",
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
} as const;

export const EQUIPMENT_LABELS = { gym: "Gimnasio", home: "Casa", both: "Gimnasio y casa" } as const;

export const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Estados en los que el contacto sigue «abierto» (hay que hacer algo). */
export const OPEN_STATUSES: readonly ContactStatus[] = ["pending", "scheduled", "done", "thinking"];

export type ContactLike = {
  status: ContactStatus;
  next_followup_on: string | null;
  call_at?: string | null;
};

/** Toca escribirle: tiene seguimiento para hoy o antes y sigue abierto. */
export function isFollowupDue(c: ContactLike, today: string): boolean {
  return OPEN_STATUSES.includes(c.status) && c.next_followup_on !== null && c.next_followup_on <= today;
}

export type ContactIntakeSource = {
  goal: string | null;
  injuries: string | null;
  experience: keyof typeof EXPERIENCE_LABELS | null;
  available_days: number[];
  availability_notes: string | null;
  equipment: keyof typeof EQUIPMENT_LABELS | null;
  equipment_notes: string | null;
  allergy_notes: string | null;
};

/**
 * Lo que Jaime apuntó en la llamada pasa a la ficha del cliente nuevo, para que al
 * entrar se la encuentre rellena (y solo tenga que revisarla).
 */
export function contactToIntake(c: ContactIntakeSource) {
  const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const days = [...new Set(c.available_days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return {
    goal: clean(c.goal),
    injuries: clean(c.injuries),
    experience: c.experience,
    available_days: days,
    class_schedule: clean(c.availability_notes),
    equipment: c.equipment,
    equipment_notes: clean(c.equipment_notes),
    allergy_notes: clean(c.allergy_notes),
  };
}

/** Enlace a «Nuevo cliente» con los datos del contacto ya puestos. */
export function newClientHref(c: {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  plan_interest: string | null;
}) {
  const p = new URLSearchParams({ nombre: c.full_name, contacto: c.id });
  if (c.email) p.set("email", c.email);
  if (c.phone) p.set("telefono", c.phone);
  if (c.plan_interest) p.set("plan", c.plan_interest);
  return `/panel/clientes/nuevo?${p.toString()}`;
}
