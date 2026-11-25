import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getThread } from "@/features/chat/queries";
import { ChatThread } from "@/features/chat/ui/chat-thread";

export default async function ClientChatTab({ params }: PageProps<"/panel/clientes/[id]/chat">) {
  const viewer = await requireScope("clients");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: conversationId }, { data: people }] = await Promise.all([
    supabase.rpc("get_or_create_conversation", { p_client_id: id }),
    supabase.from("clients").select("profile_id, profiles(full_name)").eq("id", id).single(),
  ]);
  const { data: staff } = await supabase.from("profiles").select("id, full_name").in("role", ["owner", "admin"]);
  const names: Record<string, string> = Object.fromEntries(
    (staff ?? []).map((s) => [s.id, s.full_name.split(" ")[0] ?? "Equipo"]),
  );
  if (people?.profile_id) names[people.profile_id] = people.profiles?.full_name ?? "Cliente";
  const messages = conversationId ? await getThread(conversationId as string) : [];
  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-96 flex-col rounded-xl border bg-card p-3">
      {conversationId ? (
        <ChatThread
          conversationId={conversationId as string}
          clientId={id}
          viewerId={viewer.id}
          initial={messages}
          names={names}
        />
      ) : (
        <p className="text-muted-foreground">No se ha podido abrir la conversación.</p>
      )}
    </div>
  );
}
