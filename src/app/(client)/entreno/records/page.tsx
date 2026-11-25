import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/domain/training/time";
import { EmptyState } from "@/components/twj/empty-state";
import { formatDate } from "@/features/clients/ui";

export const metadata: Metadata = { title: "Récords" };

const LABEL: Record<string, string> = {
  max_load: "Carga máxima",
  e1rm: "1RM estimado",
  best_time: "Mejor tiempo",
  hyrox_station: "Estación HYROX",
  longest_distance: "Distancia más larga",
};
const LOWER = new Set(["best_time", "hyrox_station"]);

export default async function RecordsPage() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const [{ data }, { data: stations }] = await Promise.all([
    supabase
      .from("personal_records")
      .select("id, record_type, record_key, value, unit, achieved_at, exercise_id, exercises(name)")
      .eq("client_id", ctx.client.id)
      .order("achieved_at", { ascending: false }),
    supabase.from("hyrox_stations").select("key, name"),
  ]);
  // Mejor marca vigente de cada tipo/ejercicio
  const best = new Map<string, NonNullable<typeof data>[number]>();
  for (const r of data ?? []) {
    const k = `${r.record_type}|${r.exercise_id ?? ""}|${r.record_key}`;
    const cur = best.get(k);
    const v = Number(r.value);
    if (!cur || (LOWER.has(r.record_type) ? v < Number(cur.value) : v > Number(cur.value))) best.set(k, r);
  }
  const list = [...best.values()];
  const show = (r: (typeof list)[number]) =>
    r.unit === "s"
      ? formatDuration(Number(r.value))
      : r.unit === "m"
        ? `${(Number(r.value) / 1000).toLocaleString("es-ES")} km`
        : `${Number(r.value).toLocaleString("es-ES")} kg`;
  const what = (r: (typeof list)[number]) =>
    r.exercises?.name ??
    (r.record_type === "best_time"
      ? `${Number(r.record_key) / 1000} km`
      : r.record_type === "hyrox_station"
        ? (stations?.find((s) => s.key === r.record_key)?.name ?? r.record_key)
        : "Carrera");

  return (
    <div className="space-y-4">
      <Link href="/entreno" className="text-sm text-muted-foreground hover:underline">
        ← Entreno
      </Link>
      <h1 className="text-3xl font-extrabold">Tus récords</h1>
      {list.length ? (
        <ul className="divide-y rounded-2xl border">
          {list.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Trophy className="size-5 shrink-0 text-accent" aria-hidden />
              <span className="flex-1">
                <span className="font-semibold">{what(r)}</span>
                <span className="block text-xs text-muted-foreground">
                  {LABEL[r.record_type]} · {formatDate(r.achieved_at)}
                </span>
              </span>
              <strong className="tabular-nums">{show(r)}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Trophy}
          title="Tus récords aparecerán aquí en cuanto registres entrenos. Sin presión. Bueno, un poco."
        />
      )}
    </div>
  );
}
