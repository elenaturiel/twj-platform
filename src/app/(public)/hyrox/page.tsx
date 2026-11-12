import type { Metadata } from "next";
import { HyroxForm } from "@/features/hyrox/ui/hyrox-form";

export const metadata: Metadata = {
  title: "HYROX sin postureo",
  description: "Tres preguntas rápidas para preparar tu primer HYROX con Jaime.",
};

const PLACES = ["barra", "home", "planes", "footer", "app", "banner"];

export default async function HyroxPage({ searchParams }: PageProps<"/hyrox">) {
  const sp = await searchParams;
  const ub = typeof sp.ub === "string" && PLACES.includes(sp.ub) ? sp.ub : "directo";
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold tracking-[0.25em] text-accent uppercase">HYROX · sin postureo</p>
        <h1 className="mt-3 text-3xl font-extrabold">Tu primer HYROX, sin hacerte el héroe.</h1>
        <p className="mt-2 text-muted-foreground">
          Tres preguntas rápidas para saber en qué punto estás y cómo preparar tu primer HYROX. Sin spam, sin “rise and
          grind”.
        </p>
      </div>
      <HyroxForm ub={ub} />
    </div>
  );
}
