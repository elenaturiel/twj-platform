"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ChatResult = { ok: true; id: string } | { ok: false; error: string };

const sendSchema = z.object({
  conversationId: z.uuid(),
  clientId: z.uuid(),
  body: z.string().max(4000).optional(),
  attachmentPath: z.string().max(300).optional(),
  attachmentType: z.enum(["image", "video", "audio", "file"]).optional(),
});

export async function sendMessage(input: z.infer<typeof sendSchema>): Promise<ChatResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sin sesión." };
  const p = sendSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Mensaje no válido." };
  const body = p.data.body?.trim() || null;
  if (!body && !p.data.attachmentPath) return { ok: false, error: "El mensaje está vacío." };
  // El adjunto tiene que estar en la carpeta del cliente
  if (p.data.attachmentPath && !p.data.attachmentPath.startsWith(`${p.data.clientId}/`))
    return { ok: false, error: "Adjunto no válido." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: p.data.conversationId,
      client_id: p.data.clientId,
      sender_id: viewer.id,
      body,
      attachment_path: p.data.attachmentPath ?? null,
      attachment_type: p.data.attachmentType ?? null,
    })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.code === "42501" ? "Tu plan no incluye el chat." : "No se ha podido enviar." };
  revalidatePath("/panel/chat");
  return { ok: true, id: data.id };
}

export async function markRead(conversationId: string) {
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
}

export async function deleteMessage(id: string) {
  const supabase = await createClient();
  const viewer = await getViewer();
  if (!viewer) return;
  await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("sender_id", viewer.id);
}

/** URL firmada de un adjunto que llega por Realtime. RLS decide si se puede. */
export async function attachmentUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("chat").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
