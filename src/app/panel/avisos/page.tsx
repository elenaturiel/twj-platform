import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { MarkAllReadButton } from "@/features/config/mark-read-button";
import { formatDate } from "@/features/clients/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Avisos" };

export default async function NotificationsPage() {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("profile_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Avisos</h1>
        <MarkAllReadButton />
      </div>
      {data?.length ? (
        <ul className="divide-y rounded-xl border">
          {data.map((n) => (
            <li key={n.id} className={cn("px-4 py-3", !n.read_at && "bg-secondary/40")}>
              <Link href={n.link ?? "#"} className="font-medium hover:underline">
                {n.title}
              </Link>
              {n.body ? <p className="text-sm whitespace-pre-line text-muted-foreground">{n.body}</p> : null}
              <p className="text-xs text-muted-foreground">{formatDate(n.created_at, true)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={"Nada nuevo. Disfruta del silencio."} />
      )}
    </div>
  );
}
