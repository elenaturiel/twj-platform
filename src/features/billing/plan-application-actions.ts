"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentLegalVersions } from "@/features/legal/consents.server";
import { HYROX_DIVISIONS } from "./plan-application";

const schema = z.object({
  planKey: z.string().regex(/^[a-z0-9_]{2,40}$/),
  name: z.string().trim().min(2, { error: "Pon tu nombre" }).max(120),
  email: z.email({ error: "Email no válido" }).trim().toLowerCase(),
  phone: z.string().trim().max(30).optional(),
  eventName: z.string().trim().max(160).optional(),
  eventDate: z.iso.date({ error: "Fecha no válida" }).optional().or(z.literal("")),
  division: z.enum(HYROX_DIVISIONS).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional(),
  acceptPrivacy: z.literal("on", { error: "Necesitamos tu consentimiento para contactarte" }),
  website: z.string().max(0).optional(), // trampa anti-bots
});

export type PlanApplicationState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

/** Solicitud de un plan a medida (HYROX…): llega a Pendientes y Jaime la convierte en cliente. */
export async function submitPlanApplication(
  _: PlanApplicationState,
  formData: FormData,
): Promise<PlanApplicationState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Revisa los campos marcados.", fieldErrors };
  }
  const d = parsed.data;
  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans")
    .select("key, name, requires_application, is_active")
    .eq("key", d.planKey)
    .maybeSingle();
  if (!plan?.is_active || !plan.requires_application) return { error: "Este plan no admite solicitudes." };

  const versions = await currentLegalVersions();
  const { data: lead, error } = await admin
    .from("leads")
    .insert({
      kind: "plan_application",
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      event_name: d.eventName || null,
      event_date: d.eventDate || null,
      message: d.message || null,
      answers: { plan: plan.key, ...(d.division ? { division: d.division } : {}) },
      consent_version: versions.privacy ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: "No hemos podido enviar la solicitud. Prueba otra vez." };

  await admin.rpc("notify_staff", {
    p_type: "plan_application",
    p_title: `Solicitud ${plan.name}: ${d.name}`,
    p_body: [d.eventName, d.eventDate, d.division].filter(Boolean).join(" · ") || undefined,
    p_link: `/panel/pendientes?lead=${lead.id}`,
  });
  return { ok: true };
}
