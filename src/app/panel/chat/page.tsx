import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requireScope } from "@/lib/auth/dal";
import { getInbox } from "@/features/chat/queries";
import { formatDate } from "@/features/clients/ui";
import { EmptyState } from "@/components/twj/empty-state";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mensajes" };

export default async function InboxPage() {
  const viewer = await requireScope("clients");
  const inbox = await getInbox(viewer.id);
  const waiting = inbox.filter((c) => c.awaitingReply).length;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-extrabold">Mensajes</h1>
        <p className="text-sm text-muted-foreground">
          {waiting ? `${waiting} esperando respuesta` : "Todo respondido"}
        </p>
      </div>
      {inbox.length ? (
        <ul className="divide-y rounded-xl border">
          {inbox.map((c) => (
            <li key={c.id}>
              <Link
                href={`/panel/clientes/${c.clientId}/chat`}
                className={cn("flex items-center gap-3 px-4 py-3 hover:bg-muted/50", c.unread && "bg-secondary/40")}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block", c.unread ? "font-bold" : "font-medium")}>{c.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">{c.preview}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{formatDate(c.at, true)}</span>
                  {c.awaitingReply ? (
                    <Badge variant={c.unread ? "default" : "outline"}>{c.unread ? "Nuevo" : "Por responder"}</Badge>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={MessageSquare} title="Sin mensajes todavía." />
      )}
    </div>
  );
}
