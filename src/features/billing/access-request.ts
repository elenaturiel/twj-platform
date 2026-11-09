"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AccessRequestState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Pon tu nombre").max(120),
  email: z.email("Ese email no parece válido").trim().toLowerCase(),
  phone: z.string().trim().max(30).optional(),
  planKey: z.string().max(30).optional(),
  message: z.string().trim().max(2000).optional(),
  privacy: z.literal("on", { error: "Acepta la política de privacidad" }),
  website: z.string().max(0).optional(), // trampa para bots
});

/** Solicitud de plaza (alta cerrada): queda en Pendientes para que el equipo acepte. */
export async function requestAccess(_: AccessRequestState, formData: FormData): Promise<AccessRequestState> {
  const raw = Object.fromEntries(formData.entries());
  if (typeof raw.website === "string" && raw.website.length > 0) return { ok: true };
  const p = schema.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Revisa los datos." };
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    kind: "access_request",
    name: p.data.name,
    email: p.data.email,
    phone: p.data.phone || null,
    message: p.data.message || null,
    answers: { plan: p.data.planKey ?? null },
  });
  if (error) return { error: "No se ha podido enviar. Prueba otra vez." };
  await createAdminClient().rpc("notify_staff", {
    p_type: "access_request",
    p_title: `Solicitud de plaza: ${p.data.name}`,
    p_body:
      [p.data.planKey ? `Plan ${p.data.planKey}` : null, p.data.phone].filter(Boolean).join(" · ") || p.data.email,
    p_link: "/panel/pendientes",
  });
  return { ok: true };
}
