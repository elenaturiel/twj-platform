import type { Metadata } from "next";
import Link from "next/link";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { LOG_SELECT, LogsList, type LogWithSets } from "@/features/training/ui/logs-list";

export const metadata: Metadata = { title: "Historial" };

export default async function HistoryPage() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const { data } = await supabase
    .from("workout_logs")
    .select(LOG_SELECT)
    .eq("client_id", ctx.client.id)
    .order("started_at", { ascending: false })
    .limit(50);
  return (
    <div className="space-y-4">
      <Link href="/entreno" className="text-sm text-muted-foreground hover:underline">
        ← Entreno
      </Link>
      <h1 className="text-3xl font-extrabold">Historial</h1>
      <LogsList logs={(data ?? []) as unknown as LogWithSets[]} />
    </div>
  );
}
