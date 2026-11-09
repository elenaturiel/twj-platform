"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type HyroxResult = { ok: true; message?: string } | { ok: false; error: string };

const mailingSchema = z.object({
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(10).max(10000),
  nivel: z.array(z.string()).default([]),
  cuando: z.array(z.string()).default([]),
});

/** Prepara un email masivo; el cron lo envía por tandas. */
export async function queueMailing(input: z.input<typeof mailingSchema>): Promise<HyroxResult> {
  const viewer = await requireScope("clients");
  const p = mailingSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa el asunto y el texto." };
  const supabase = await createClient();
  let q = supabase
    .from("waitlist_hyrox")
    .select("id")
    .not("email", "is", null)
    .not("consent_at", "is", null)
    .neq("status", "unsubscribed");
  if (p.data.nivel.length) q = q.in("nivel", p.data.nivel);
  if (p.data.cuando.length) q = q.in("cuando", p.data.cuando);
  const { data: recipients } = await q;
  if (!recipients?.length) return { ok: false, error: "No hay nadie con email y consentimiento con ese filtro." };
  const { data: m, error } = await supabase
    .from("hyrox_mailings")
    .insert({
      subject: p.data.subject,
      body: p.data.body,
      filter: { nivel: p.data.nivel, cuando: p.data.cuando },
      total: recipients.length,
      created_by: viewer.id,
    })
    .select("id")
    .single();
  if (error || !m) return { ok: false, error: "No se ha podido preparar el envío." };
  const { error: e2 } = await supabase
    .from("hyrox_mailing_recipients")
    .insert(recipients.map((r) => ({ mailing_id: m.id, waitlist_id: r.id })));
  if (e2) return { ok: false, error: "No se ha podido preparar el envío." };
  revalidatePath("/panel/hyrox");
  return { ok: true, message: `En cola: ${recipients.length} emails. Se envían en los próximos minutos.` };
}

export async function updateWaitlistEntry(input: {
  id: string;
  status?: "lead" | "subscribed" | "contacted" | "converted" | "unsubscribed";
  notes?: string;
}): Promise<HyroxResult> {
  await requireScope("clients");
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_hyrox")
    .update({
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes.slice(0, 1000) } : {}),
    })
    .eq("id", input.id);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/hyrox");
  return { ok: true };
}

export async function deleteWaitlistEntry(id: string): Promise<HyroxResult> {
  await requireScope("clients");
  const supabase = await createClient();
  await supabase.from("waitlist_hyrox").delete().eq("id", id);
  revalidatePath("/panel/hyrox");
  return { ok: true };
}

const eventSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  city: z.string().max(80).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  is_active: z.boolean(),
});

export async function saveHyroxEvent(input: z.input<typeof eventSchema>): Promise<HyroxResult> {
  await requireScope("clients");
  const p = eventSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa el evento." };
  const supabase = await createClient();
  const { id, ...row } = p.data;
  const { error } = id
    ? await supabase
        .from("hyrox_events")
        .update({ ...row, city: row.city || null })
        .eq("id", id)
    : await supabase.from("hyrox_events").insert({ ...row, city: row.city || null });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/hyrox");
  return { ok: true };
}
