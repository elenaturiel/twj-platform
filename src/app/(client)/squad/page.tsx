import type { Metadata } from "next";
import Link from "next/link";
import { Flame, Users } from "lucide-react";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/twj/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tu squad" };

export default async function SquadPage() {
  await requireClientWithAccess();
  const supabase = await createClient();
  const [{ data: squad }, { data: members }] = await Promise.all([
    supabase.from("squads").select("code").maybeSingle(),
    supabase.rpc("my_squad_overview"),
  ]);
  if (!squad) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold">Squad</h1>
        <EmptyState icon={Users} title="Aún no estás en un squad.">
          <p className="text-sm text-muted-foreground">
            Entrenad en grupo: con 3 personas, −15 % para todos; con 4, −25 %. Pregúntale a Jaime cómo crear el vuestro.
          </p>
        </EmptyState>
      </div>
    );
  }
  const size = members?.length ?? 1;
  const tier = size >= 4 ? 25 : size >= 3 ? 15 : 0;
  const site = publicEnv().NEXT_PUBLIC_SITE_URL ?? "";
  const invite = `${site}/empezar?squad=${encodeURIComponent(squad.code)}`;
  const text = `Únete a mi squad de Train with Jaime y entrenamos juntos (descuento para todos): ${invite}`;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Tu squad</h1>
        <p className="text-sm text-muted-foreground">
          Sois {size}.{" "}
          {tier ? `Descuento squad: −${tier} % para todos.` : "Con 3 personas, −15 % para todos; con 4, −25 %."}
        </p>
      </div>
      <ul className="divide-y rounded-2xl border">
        {(members ?? []).map((m, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-muted font-bold">
              {m.first_name?.[0] ?? "?"}
            </span>
            <span className="flex-1">
              <span className="font-semibold">{m.is_me ? "Tú" : m.first_name}</span>
              <span className="block text-xs text-muted-foreground">
                Esta semana: {m.week_done}/{m.week_planned || "–"} sesiones
              </span>
            </span>
            <span
              className="flex items-center gap-1 text-sm font-semibold tabular-nums"
              aria-label={`${m.training_weeks} semanas de racha`}
            >
              <Flame className="size-4 text-accent" aria-hidden /> {m.training_weeks}
            </span>
          </li>
        ))}
      </ul>
      <section className="space-y-2 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Invita a alguien</h2>
        <p className="text-sm">
          Código: <code className="rounded bg-muted px-1.5 py-0.5 font-semibold">{squad.code}</code>
        </p>
        <Button asChild className="w-full">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
            Invitar por WhatsApp
          </a>
        </Button>
        <p className="text-xs text-muted-foreground">
          Si alguien se da de baja, el descuento baja de tramo para todos. Más detalles en{" "}
          <Link href="/perfil/plan" className="underline">
            Mi plan
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
