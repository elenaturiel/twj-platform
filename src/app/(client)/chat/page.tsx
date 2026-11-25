import type { Metadata } from "next";
import { cheapestPlanWith, clientHasFeature, requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getThread } from "@/features/chat/queries";
import { ChatThread } from "@/features/chat/ui/chat-thread";
import { LockedFeature } from "@/components/twj/locked-feature";

export const metadata: Metadata = { title: "Chat" };

export default async function ClientChatPage() {
  const ctx = await requireClientWithAccess();
  if (!(await clientHasFeature(ctx.client.id, "chat"))) {
    const plan = await cheapestPlanWith("chat");
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Chat</h1>
        <LockedFeature planName={plan?.name ?? "Rookie"} planKey={plan?.key ?? "rookie"} />
      </div>
    );
  }
  const supabase = await createClient();
  const [{ data: conversationId }, { data: staff }, { data: intro }] = await Promise.all([
    supabase.rpc("get_or_create_conversation", { p_client_id: ctx.client.id }),
    supabase.from("profiles").select("id, full_name").in("role", ["owner", "admin"]),
    supabase.from("settings").select("value").eq("key", "chat.intro").maybeSingle(),
  ]);
  const messages = conversationId ? await getThread(conversationId as string) : [];
  const names = Object.fromEntries((staff ?? []).map((s) => [s.id, s.full_name.split(" ")[0] ?? "Equipo"]));

  return (
    <div className="flex flex-col">
      <h1 className="text-3xl font-extrabold">Chat con Jaime</h1>
      {typeof intro?.value === "string" ? <p className="text-xs text-muted-foreground">{intro.value}</p> : null}
      {conversationId ? (
        <ChatThread
          conversationId={conversationId as string}
          clientId={ctx.client.id}
          viewerId={ctx.viewer.id}
          initial={messages}
          names={names}
          fullPage
        />
      ) : (
        <p className="text-muted-foreground">No se ha podido abrir el chat.</p>
      )}
    </div>
  );
}
