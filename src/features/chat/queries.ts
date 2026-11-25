import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  attachment_type: "image" | "video" | "audio" | "file" | null;
  created_at: string;
  deleted_at: string | null;
  url: string | null;
};

/** Últimos mensajes de una conversación, con URLs firmadas de los adjuntos (1 h). */
export async function getThread(conversationId: string, limit = 100): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, body, attachment_path, attachment_type, created_at, deleted_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).reverse();
  const paths = rows.filter((m) => m.attachment_path && !m.deleted_at).map((m) => m.attachment_path!);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("chat").createSignedUrls(paths, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }
  return rows.map((m) => ({
    ...m,
    attachment_type: m.attachment_type as ChatMessage["attachment_type"],
    url: m.attachment_path ? (urls.get(m.attachment_path) ?? null) : null,
  }));
}

/** Bandeja del equipo: conversaciones con último mensaje y no leídos. */
export async function getInbox(viewerId: string) {
  const supabase = await createClient();
  const [{ data: convs }, { data: reads }] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, client_id, last_message_at, last_message_preview, last_sender_id, clients(profiles(full_name))")
      .not("last_message_at", "is", null)
      .order("last_message_at", { ascending: false })
      .limit(100),
    supabase.from("conversation_reads").select("conversation_id, last_read_at").eq("profile_id", viewerId),
  ]);
  const readMap = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at]));
  const { data: staff } = await supabase.from("profiles").select("id").in("role", ["owner", "admin"]);
  const staffIds = new Set((staff ?? []).map((s) => s.id));
  return (convs ?? []).map((c) => {
    const lastRead = readMap.get(c.id);
    const fromClient = c.last_sender_id ? !staffIds.has(c.last_sender_id) : false;
    return {
      id: c.id,
      clientId: c.client_id,
      name: c.clients?.profiles?.full_name ?? "Cliente",
      preview: c.last_message_preview,
      at: c.last_message_at!,
      // Pendiente de responder = el último mensaje es del cliente y no lo hemos leído
      unread: fromClient && (!lastRead || lastRead < c.last_message_at!),
      awaitingReply: fromClient,
    };
  });
}
