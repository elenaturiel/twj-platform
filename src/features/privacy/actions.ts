"use server";

import { revalidatePath } from "next/cache";
import { getClientContext, requireScope } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordConsents } from "@/features/legal/consents.server";
import { anonymizeClient } from "./anonymize.server";

export type PrivacyResult = { ok: true; message?: string } | { ok: false; error: string };

/** El cliente cambia los consentimientos opcionales (marketing, fotos de progreso). */
export async function updateOptionalConsent(
  kind: "marketing" | "progress_photos",
  granted: boolean,
): Promise<PrivacyResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sin sesión." };
  await recordConsents(ctx.viewer.id, { [kind]: granted });
  revalidatePath("/perfil/privacidad");
  return { ok: true };
}

/** Pide eliminar la cuenta. Lo tramita el equipo (hay que cerrar pagos pendientes). */
export async function requestDeletion(reason: string): Promise<PrivacyResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sin sesión." };
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("data_requests")
    .select("id")
    .eq("profile_id", ctx.viewer.id)
    .eq("kind", "delete")
    .eq("status", "pending")
    .maybeSingle();
  if (pending) return { ok: true, message: "Ya tenemos tu solicitud. Te escribimos en cuanto esté hecha." };
  const { error } = await supabase.from("data_requests").insert({
    profile_id: ctx.viewer.id,
    client_id: ctx.client.id,
    kind: "delete",
    reason: reason.trim().slice(0, 1000) || null,
  });
  if (error) return { ok: false, error: "No se ha podido enviar." };
  await createAdminClient().rpc("notify_staff", {
    p_type: "data_request",
    p_title: `${ctx.viewer.fullName} pide eliminar su cuenta`,
    p_body: "RGPD: plazo máximo de un mes para responder.",
    p_link: "/panel/privacidad",
    p_client_id: ctx.client.id,
  });
  revalidatePath("/perfil/privacidad");
  return { ok: true, message: "Solicitud enviada. Jaime la tramita en un plazo máximo de un mes." };
}

/** Equipo: tramita una solicitud de supresión (anonimiza). */
export async function processDeletion(requestId: string): Promise<PrivacyResult> {
  const viewer = await requireScope("team");
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("data_requests")
    .select("id, client_id, status, kind")
    .eq("id", requestId)
    .single();
  if (!req || req.kind !== "delete" || req.status !== "pending" || !req.client_id)
    return { ok: false, error: "Solicitud no válida." };
  const { data: client } = await supabase.from("clients").select("status").eq("id", req.client_id).single();
  if (client && ["active", "past_due", "paused"].includes(client.status)) {
    return { ok: false, error: "Primero da de baja su suscripción (Pagos) para que no se le vuelva a cobrar." };
  }
  try {
    await anonymizeClient(req.client_id);
  } catch (e) {
    return { ok: false, error: `No se ha podido anonimizar: ${(e as Error).message}` };
  }
  await supabase
    .from("data_requests")
    .update({ status: "done", processed_by: viewer.id, processed_at: new Date().toISOString() })
    .eq("id", requestId);
  revalidatePath("/panel/privacidad");
  return { ok: true, message: "Cuenta anonimizada. Los pagos se conservan por obligación fiscal." };
}

export async function rejectRequest(requestId: string, notes: string): Promise<PrivacyResult> {
  const viewer = await requireScope("team");
  const supabase = await createClient();
  await supabase
    .from("data_requests")
    .update({
      status: "rejected",
      notes: notes.slice(0, 1000),
      processed_by: viewer.id,
      processed_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  revalidatePath("/panel/privacidad");
  return { ok: true };
}
