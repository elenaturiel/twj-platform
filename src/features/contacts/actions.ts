"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { CONTACT_KINDS, CONTACT_STATUSES } from "@/domain/contacts/contacts";

export type ContactResult = { ok: true; id?: string } | { ok: false; error: string };

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const contactSchema = z.object({
  id: z.uuid().optional(),
  fullName: z.string().trim().min(2, "Pon el nombre").max(120),
  email: z
    .union([z.email().trim().toLowerCase(), z.literal("")])
    .optional()
    .transform((v) => v || null),
  phone: opt(40),
  kind: z.enum(CONTACT_KINDS),
  status: z.enum(CONTACT_STATUSES),
  source: opt(80),
  company: opt(120),
  callAt: opt(40),
  nextFollowupOn: z
    .union([z.iso.date(), z.literal("")])
    .optional()
    .transform((v) => v || null),
  age: z
    .union([z.coerce.number().int().min(5).max(100), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  experience: z
    .enum(["none", "beginner", "intermediate", "advanced", ""])
    .optional()
    .transform((v) => v || null),
  goal: opt(1000),
  injuries: opt(1000),
  availableDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  availabilityNotes: opt(500),
  equipment: z
    .enum(["gym", "home", "both", ""])
    .optional()
    .transform((v) => v || null),
  equipmentNotes: opt(500),
  allergyNotes: opt(1000),
  planInterest: opt(40),
  notes: opt(20000),
  lostReason: opt(500),
});

function refresh(id?: string) {
  revalidatePath("/panel/contactos");
  if (id) revalidatePath(`/panel/contactos/${id}`);
  revalidatePath("/panel/pendientes");
}

export async function saveContact(input: z.input<typeof contactSchema>): Promise<ContactResult> {
  const viewer = await requireScope("clients");
  const p = contactSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Revisa los datos." };
  const d = p.data;
  const row = {
    full_name: d.fullName,
    email: d.email,
    phone: d.phone,
    kind: d.kind,
    status: d.status,
    source: d.source,
    company: d.company,
    call_at: d.callAt ? new Date(d.callAt).toISOString() : null,
    next_followup_on: d.nextFollowupOn,
    age: d.age,
    experience: d.experience,
    goal: d.goal,
    injuries: d.injuries,
    available_days: [...new Set(d.availableDays)].sort(),
    availability_notes: d.availabilityNotes,
    equipment: d.equipment,
    equipment_notes: d.equipmentNotes,
    allergy_notes: d.allergyNotes,
    plan_interest: d.planInterest,
    notes: d.notes,
    lost_reason: d.lostReason,
  };
  const supabase = await createClient();
  if (d.id) {
    const { error } = await supabase.from("contacts").update(row).eq("id", d.id);
    if (error) return { ok: false, error: "No se ha podido guardar." };
    refresh(d.id);
    return { ok: true, id: d.id };
  }
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...row, created_by: viewer.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "No se ha podido guardar." };
  refresh(data.id);
  return { ok: true, id: data.id };
}

export async function deleteContact(id: string): Promise<ContactResult> {
  await requireScope("clients");
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Contacto no válido." };
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido borrar." };
  refresh();
  return { ok: true };
}

export async function addContactComment(contactId: string, body: string): Promise<ContactResult> {
  const viewer = await requireScope("clients");
  const text = body.trim();
  if (!z.uuid().safeParse(contactId).success || !text || text.length > 4000)
    return { ok: false, error: "Escribe un comentario (máx. 4000 caracteres)." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_comments")
    .insert({ contact_id: contactId, author_id: viewer.id, body: text });
  if (error) return { ok: false, error: "No se ha podido guardar el comentario." };
  // El contacto «se mueve»: sube arriba en la lista
  await supabase.from("contacts").update({ updated_at: new Date().toISOString() }).eq("id", contactId);
  refresh(contactId);
  return { ok: true };
}

export async function deleteContactComment(id: string, contactId: string): Promise<ContactResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { error } = await supabase.from("contact_comments").delete().eq("id", id);
  if (error) return { ok: false, error: "No se ha podido borrar." };
  refresh(contactId);
  return { ok: true };
}
