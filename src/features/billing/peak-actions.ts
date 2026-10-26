"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentLegalVersions } from "@/features/legal/consents.server";

const peakSchema = z.object({
  name: z.string().trim().min(2, { error: "Pon tu nombre" }).max(120),
  email: z.email({ error: "Email no válido" }).trim().toLowerCase(),
  phone: z.string().trim().max(30).optional(),
  packWeeks: z.coerce.number().refine((n) => [8, 10, 12].includes(n), { error: "Elige 8, 10 o 12 semanas" }),
  eventName: z.string().trim().min(2, { error: "¿Para qué prueba?" }).max(160),
  eventDate: z.iso.date({ error: "Fecha no válida" }).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional(),
  acceptPrivacy: z.literal("on", { error: "Necesitamos tu consentimiento para contactarte" }),
  website: z.string().max(0).optional(), // honeypot anti-spam
});

export type PeakState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function submitPeakApplication(_: PeakState, formData: FormData): Promise<PeakState> {
  const parsed = peakSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Revisa los campos marcados.", fieldErrors };
  }
  const d = parsed.data;
  const admin = createAdminClient();
  const versions = await currentLegalVersions();
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      kind: "peak_application",
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      pack_weeks: d.packWeeks,
      event_name: d.eventName,
      event_date: d.eventDate || null,
      message: d.message || null,
      consent_version: versions.privacy ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: "No hemos podido enviar la solicitud. Prueba otra vez." };

  await admin.rpc("notify_staff", {
    p_type: "peak_application",
    p_title: `Solicitud Peak: ${d.name}`,
    p_body: `${d.eventName}${d.eventDate ? ` (${d.eventDate})` : ""} · ${d.packWeeks} semanas`,
    p_link: `/panel/pendientes?lead=${lead.id}`,
  });
  return { ok: true };
}
