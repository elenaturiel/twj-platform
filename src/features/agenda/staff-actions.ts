"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { evaluateQuietly } from "@/features/engagement/engine.server";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fulfillExtraSession } from "./extra.server";
import { afterBooking, afterCancel, afterReschedule, bookingError } from "./sync.server";

export type StaffAgendaResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };
const fail = (error: string): StaffAgendaResult => ({ ok: false, error });

function refresh(clientId?: string | null) {
  revalidatePath("/panel/agenda", "layout");
  if (clientId) revalidatePath(`/panel/clientes/${clientId}/agenda`);
  revalidatePath("/agenda", "layout");
  revalidatePath("/hoy");
}

// ───────────────────────────── Citas ─────────────────────────────

const staffBookSchema = z.object({
  clientId: z.uuid(),
  typeKey: z.string().min(2),
  startsAt: z.iso.datetime(),
  useCredit: z.boolean(),
  notes: z.string().max(1000).optional(),
});

export async function staffBook(input: z.infer<typeof staffBookSchema>): Promise<StaffAgendaResult> {
  await requireScope("clients");
  const p = staffBookSchema.safeParse(input);
  if (!p.success) return fail("Revisa los datos de la cita.");
  const supabase = await createClient();
  const { data: who } = await supabase.from("clients").select("guardian_status").eq("id", p.data.clientId).single();
  if (who?.guardian_status === "pending")
    return fail("Es menor y falta la autorización firmada de su tutor/a: apruébala antes de entrenar con él/ella.");
  const { data: id, error } = await supabase.rpc("book_appointment", {
    p_type: p.data.typeKey,
    p_starts_at: p.data.startsAt,
    p_client_id: p.data.clientId,
    p_notes: p.data.notes || undefined,
    p_use_credit: p.data.useCredit,
  });
  if (error || !id) return fail(bookingError(error?.message));
  await afterBooking(id as string, "staff");
  refresh(p.data.clientId);
  return { ok: true, id: id as string };
}

export async function staffCancel(id: string, reason?: string): Promise<StaffAgendaResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: refunded, error } = await supabase.rpc("cancel_appointment", {
    p_id: id,
    p_reason: reason || undefined,
  });
  if (error) return fail(bookingError(error.message));
  await afterCancel(id, "staff", Boolean(refunded));
  refresh();
  return { ok: true, message: refunded ? "Cancelada y crédito devuelto." : "Cancelada." };
}

export async function staffReschedule(id: string, startsAt: string): Promise<StaffAgendaResult> {
  await requireScope("clients");
  if (!z.iso.datetime().safeParse(startsAt).success) return fail("Hora no válida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", { p_id: id, p_starts_at: startsAt });
  if (error) return fail(bookingError(error.message));
  await afterReschedule(id, "staff");
  refresh();
  return { ok: true };
}

const outcomeSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "completed", "no_show"]),
  staffNotes: z.string().max(4000).optional(),
  summary: z.string().max(4000).optional(),
  goals: z.array(z.string().trim().max(200)).max(3),
  notifyClient: z.boolean().default(false),
});

/** Cierra la cita: hecha / no se presentó, notas internas y resumen con 3 objetivos. */
export async function saveAppointmentOutcome(input: z.input<typeof outcomeSchema>): Promise<StaffAgendaResult> {
  await requireScope("clients");
  const p = outcomeSchema.safeParse(input);
  if (!p.success) return fail("Revisa el resumen.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: p.data.status,
      staff_notes: p.data.staffNotes || null,
      summary: p.data.summary || null,
      goals: p.data.goals.filter(Boolean),
    })
    .eq("id", p.data.id)
    .neq("status", "cancelled")
    .select("client_id, clients(profile_id), appointment_types(name)")
    .single();
  if (error || !data) return fail("No se ha podido guardar.");
  if (p.data.notifyClient && data.clients?.profile_id && (p.data.summary || p.data.goals.some(Boolean))) {
    await createAdminClient().rpc("notify", {
      p_profile_id: data.clients.profile_id,
      p_type: "session_summary",
      p_title: `Resumen de tu ${data.appointment_types?.name.toLowerCase() ?? "sesión"}`,
      p_body: p.data.goals.filter(Boolean).length
        ? `Objetivos: ${p.data.goals.filter(Boolean).join(" · ")}`
        : (p.data.summary ?? "").slice(0, 200),
      p_link: "/agenda",
      p_client_id: data.client_id,
    });
  }
  if (p.data.status === "completed") {
    await evaluateQuietly(data.client_id);
  }
  refresh(data.client_id);
  return { ok: true };
}

// ───────────────────────────── Créditos ─────────────────────────────

const creditSchema = z.object({
  clientId: z.uuid(),
  creditType: z.enum(["live_training", "monthly_call", "extra"]),
  delta: z
    .number()
    .int()
    .min(-10)
    .max(10)
    .refine((n) => n !== 0),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional(),
});

export async function adjustCredits(input: z.infer<typeof creditSchema>): Promise<StaffAgendaResult> {
  const viewer = await requireScope("clients");
  const p = creditSchema.safeParse(input);
  if (!p.success) return fail("Revisa la cantidad.");
  const supabase = await createClient();
  const { error } = await supabase.from("session_credits").insert({
    client_id: p.data.clientId,
    credit_type: p.data.creditType,
    delta: p.data.delta,
    reason: "manual",
    expires_at: p.data.expiresAt ? new Date(`${p.data.expiresAt}T23:59:59+01:00`).toISOString() : null,
    notes: p.data.notes || null,
    created_by: viewer.id,
  });
  if (error) return fail("No se ha podido guardar.");
  refresh(p.data.clientId);
  return { ok: true };
}

/** Sesión extra cobrada fuera de Stripe (Bizum, efectivo…): pago + crédito. */
export async function recordManualExtraSession(input: {
  clientId: string;
  amountCents: number;
  method: "bizum" | "transfer" | "cash" | "other";
}): Promise<StaffAgendaResult> {
  const viewer = await requireScope("billing");
  if (!z.uuid().safeParse(input.clientId).success || !(input.amountCents >= 0)) return fail("Datos no válidos.");
  await fulfillExtraSession({
    clientId: input.clientId,
    amountCents: Math.round(input.amountCents),
    method: input.method,
    reference: `manual_${randomUUID()}`,
    recordedBy: viewer.id,
  });
  refresh(input.clientId);
  revalidatePath(`/panel/clientes/${input.clientId}/pagos`);
  return { ok: true };
}

// ───────────────────────────── Disponibilidad ─────────────────────────────

const ruleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  type_keys: z.array(z.string()).default([]),
});

export async function saveAvailability(rules: z.input<typeof ruleSchema>[]): Promise<StaffAgendaResult> {
  await requireScope("clients");
  const parsed = z.array(ruleSchema).max(60).safeParse(rules);
  if (!parsed.success) return fail("Revisa las franjas.");
  if (parsed.data.some((r) => r.end_time <= r.start_time))
    return fail("Cada franja tiene que acabar después de empezar.");
  const supabase = await createClient();
  const { error: delError } = await supabase.from("availability").delete().gte("weekday", 0);
  if (delError) return fail("No se ha podido guardar.");
  if (parsed.data.length) {
    const { error } = await supabase.from("availability").insert(parsed.data);
    if (error) return fail("No se ha podido guardar.");
  }
  refresh();
  return { ok: true };
}

const exceptionSchema = z.object({
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  kind: z.enum(["blocked", "extra"]),
  reason: z.string().max(200).optional(),
});

export async function addException(input: z.infer<typeof exceptionSchema>): Promise<StaffAgendaResult> {
  const viewer = await requireScope("clients");
  const p = exceptionSchema.safeParse(input);
  if (!p.success || p.data.endsAt <= p.data.startsAt) return fail("Revisa las fechas.");
  const supabase = await createClient();
  const { error } = await supabase.from("availability_exceptions").insert({
    starts_at: p.data.startsAt,
    ends_at: p.data.endsAt,
    kind: p.data.kind,
    reason: p.data.reason || null,
    created_by: viewer.id,
  });
  if (error) return fail("No se ha podido guardar.");
  refresh();
  return { ok: true };
}

export async function deleteException(id: string): Promise<StaffAgendaResult> {
  await requireScope("clients");
  const supabase = await createClient();
  await supabase.from("availability_exceptions").delete().eq("id", id);
  refresh();
  return { ok: true };
}

const typeSchema = z.object({
  key: z.string(),
  name: z.string().trim().min(2).max(80),
  description: z.string().max(500).optional(),
  duration_min: z.number().int().min(10).max(240),
  min_notice_h: z.number().int().min(0).max(240),
  cancel_notice_h: z.number().int().min(0).max(240),
  buffer_min: z.number().int().min(0).max(120),
  bookable_by_client: z.boolean(),
  is_active: z.boolean(),
  location: z.string().max(200).optional(),
  available_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export async function updateAppointmentType(input: z.input<typeof typeSchema>): Promise<StaffAgendaResult> {
  await requireScope("clients");
  const p = typeSchema.safeParse(input);
  if (!p.success) return fail("Revisa el tipo de cita.");
  const { key, available_from, location, description, ...rest } = p.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointment_types")
    .update({
      ...rest,
      description: description || null,
      location: location || null,
      available_from: available_from || null,
    })
    .eq("key", key);
  if (error) return fail("No se ha podido guardar.");
  refresh();
  return { ok: true };
}

export async function saveAgendaSettings(input: {
  fallbackMeetUrl: string;
  horizonDays: number;
}): Promise<StaffAgendaResult> {
  await requireScope("settings");
  const url = input.fallbackMeetUrl.trim();
  if (url && !/^https:\/\/\S+$/.test(url)) return fail("El enlace tiene que empezar por https://");
  const days = Math.min(Math.max(Math.round(input.horizonDays) || 28, 7), 120);
  const supabase = await createClient();
  const r1 = await supabase.from("settings").update({ value: url }).eq("key", "agenda.fallback_meet_url");
  const r2 = await supabase.from("settings").update({ value: days }).eq("key", "agenda.booking_horizon_days");
  if (r1.error || r2.error) return fail("No se ha podido guardar.");
  refresh();
  return { ok: true };
}

export async function disconnectGoogle(): Promise<StaffAgendaResult> {
  const viewer = await requireScope("settings");
  await createAdminClient().rpc("google_disconnect", { p_profile: viewer.id });
  revalidatePath("/panel/agenda/disponibilidad");
  return { ok: true };
}
