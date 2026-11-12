"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClientContext, requireScope } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordConsents } from "@/features/legal/consents.server";

export type MinorResult = { ok: true; message?: string } | { ok: false; error: string };

const GUARDIAN_TITLE = "Autorización del tutor (firmada)";

function refreshPanel(clientId: string) {
  revalidatePath("/panel/pendientes");
  revalidatePath(`/panel/clientes/${clientId}`, "layout");
}

/** El menor registra la autorización firmada que acaba de subir a su carpeta. */
export async function submitGuardianDocument(path: string): Promise<MinorResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sesión no válida." };
  if (!path.startsWith(`${ctx.client.id}/autorizacion-tutor-`)) return { ok: false, error: "Archivo no válido." };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    client_id: ctx.client.id,
    kind: "guardian",
    title: GUARDIAN_TITLE,
    storage_path: path,
    uploaded_by: ctx.viewer.id,
  });
  if (error) return { ok: false, error: "No hemos podido guardar el documento." };
  await createAdminClient().rpc("notify_staff", {
    p_type: "guardian_document_uploaded",
    p_title: `${ctx.viewer.fullName} ha subido la autorización de su tutor/a`,
    p_body: "Revísala en Pendientes para que pueda empezar a entrenar.",
    p_link: "/panel/pendientes",
    p_client_id: ctx.client.id,
  });
  revalidatePath("/estado");
  refreshPanel(ctx.client.id);
  return { ok: true };
}

const docSchema = z.object({
  clientId: z.uuid(),
  path: z.string().min(3).max(300),
  title: z.string().trim().min(2).max(120),
  kind: z.enum(["guardian", "medical", "invoice", "consent", "other"]),
  visibleToClient: z.boolean(),
});

/** El equipo registra un documento que ha subido a la carpeta del cliente (p. ej. la autorización que le mandan por WhatsApp). */
export async function registerClientDocument(input: z.input<typeof docSchema>): Promise<MinorResult> {
  const viewer = await requireScope("clients");
  const p = docSchema.safeParse(input);
  if (!p.success || !p.data.path.startsWith(`${p.data.clientId}/`)) return { ok: false, error: "Revisa el documento." };
  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    client_id: p.data.clientId,
    kind: p.data.kind,
    title: p.data.title,
    storage_path: p.data.path,
    uploaded_by: viewer.id,
    visible_to_client: p.data.visibleToClient,
  });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  refreshPanel(p.data.clientId);
  return { ok: true, message: "Documento guardado." };
}

/** Jaime da por buena la autorización firmada: el menor ya puede entrenar. */
export async function approveGuardian(clientId: string): Promise<MinorResult> {
  const viewer = await requireScope("clients");
  if (!z.uuid().safeParse(clientId).success) return { ok: false, error: "Cliente no válido." };
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, profile_id, guardian_status, profiles(full_name)")
    .eq("id", clientId)
    .single();
  if (!client || client.guardian_status !== "pending") return { ok: false, error: "No hay autorización pendiente." };
  const { count } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("kind", "guardian");
  if (!count) return { ok: false, error: "Falta la autorización firmada: súbela antes de aprobar." };

  await admin.from("clients").update({ guardian_status: "confirmed" }).eq("id", clientId);
  await admin
    .from("guardian_authorizations")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("client_id", clientId)
    .is("confirmed_at", null);
  await recordConsents(client.profile_id, { guardian: true });
  await admin.from("audit_log").insert({
    actor_id: viewer.id,
    action: "guardian_approved",
    entity: "clients",
    entity_id: clientId,
    client_id: clientId,
    metadata: { via: "signed_document" },
  });
  await admin.rpc("notify", {
    p_profile_id: client.profile_id,
    p_type: "guardian_reviewed",
    p_title: "¡Autorización aprobada! Ya puedes empezar",
    p_body: "Jaime ha revisado la autorización de tu tutor/a. Entra y empieza tu plan.",
    p_link: "/hoy",
    p_client_id: clientId,
  });
  refreshPanel(clientId);
  return { ok: true, message: `${client.profiles?.full_name ?? "El cliente"} ya puede entrenar.` };
}

/** La autorización no vale (ilegible, sin firmar…): se quita y se le dice por qué. */
export async function rejectGuardianDocument(clientId: string, reason: string): Promise<MinorResult> {
  const viewer = await requireScope("clients");
  if (!z.uuid().safeParse(clientId).success) return { ok: false, error: "Cliente no válido." };
  const why = reason.trim().slice(0, 300);
  if (!why) return { ok: false, error: "Escribe el motivo para que lo pueda corregir." };
  const admin = createAdminClient();
  const { data: docs } = await admin
    .from("documents")
    .select("id, storage_path")
    .eq("client_id", clientId)
    .eq("kind", "guardian");
  if (!docs?.length) return { ok: false, error: "No hay documento que rechazar." };
  await admin.storage.from("documents").remove(docs.map((d) => d.storage_path));
  await admin
    .from("documents")
    .delete()
    .in(
      "id",
      docs.map((d) => d.id),
    );
  const { data: client } = await admin.from("clients").select("profile_id").eq("id", clientId).single();
  await admin.from("audit_log").insert({
    actor_id: viewer.id,
    action: "guardian_rejected",
    entity: "clients",
    entity_id: clientId,
    client_id: clientId,
    metadata: { reason: why },
  });
  if (client)
    await admin.rpc("notify", {
      p_profile_id: client.profile_id,
      p_type: "guardian_reviewed",
      p_title: "Hay que repetir la autorización de tu tutor/a",
      p_body: `Motivo: ${why}. Descárgala otra vez, que la firme y súbela.`,
      p_link: "/estado",
      p_client_id: clientId,
    });
  refreshPanel(clientId);
  return { ok: true, message: "Rechazada. Le hemos avisado del motivo." };
}
