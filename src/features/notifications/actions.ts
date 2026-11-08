"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type PrefResult = { ok: true } | { ok: false; error: string };

const prefSchema = z
  .array(
    z.object({
      type: z.string().regex(/^(\*|[a-z_]{2,40})$/),
      channel: z.enum(["email", "push"]),
      enabled: z.boolean(),
      digest: z.boolean(),
    }),
  )
  .max(100);

export async function savePreferences(rows: z.infer<typeof prefSchema>): Promise<PrefResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sin sesión." };
  const p = prefSchema.safeParse(rows);
  if (!p.success) return { ok: false, error: "Preferencias no válidas." };
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    p.data.map((r) => ({ ...r, digest: viewer.role === "client" ? false : r.digest, profile_id: viewer.id })),
    {
      onConflict: "profile_id,type,channel",
    },
  );
  if (error) return { ok: false, error: "No se han podido guardar." };
  revalidatePath(viewer.role === "client" ? "/perfil/notificaciones" : "/panel/ajustes/notificaciones");
  return { ok: true };
}

const subSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Guarda la suscripción push de este dispositivo. */
export async function subscribePush(sub: unknown, userAgent: string): Promise<PrefResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sin sesión." };
  const p = subSchema.safeParse(sub);
  if (!p.success || !p.data.endpoint.startsWith("https://")) return { ok: false, error: "Suscripción no válida." };
  const supabase = await createClient();
  // Si el endpoint era de otra cuenta en este navegador, se reasigna borrándolo primero (RLS: solo lo propio)
  await supabase.from("push_subscriptions").delete().eq("endpoint", p.data.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    profile_id: viewer.id,
    endpoint: p.data.endpoint,
    p256dh: p.data.keys.p256dh,
    auth: p.data.keys.auth,
    user_agent: userAgent.slice(0, 300),
  });
  if (error) return { ok: false, error: "No se ha podido activar en este dispositivo." };
  return { ok: true };
}

export async function unsubscribePush(endpoint: string): Promise<PrefResult> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}
