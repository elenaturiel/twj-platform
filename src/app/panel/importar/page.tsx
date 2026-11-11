import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ImportCenter } from "@/features/import/import-center";

export const metadata: Metadata = { title: "Importar desde Excel" };

export default async function ImportPage({ searchParams }: PageProps<"/panel/importar">) {
  await requireScope("clients");
  const { cliente } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, profiles(full_name)")
    .in("status", ["active", "past_due", "pending_payment"])
    .order("created_at");
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/panel/biblioteca" className="text-sm text-muted-foreground hover:underline">
        ← Biblioteca
      </Link>
      <h1 className="text-3xl font-extrabold">Importar rutinas y dietas desde Excel</h1>
      <ImportCenter
        clients={(data ?? []).map((c) => ({ id: c.id, name: c.profiles?.full_name ?? "Cliente" }))}
        defaultClientId={typeof cliente === "string" ? cliente : undefined}
      />
    </div>
  );
}
