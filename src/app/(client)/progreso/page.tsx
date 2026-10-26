import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Progreso" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Progreso</h1>
      <EmptyState icon={Construction} title="Métricas, fotos y check-ins llegan en la Fase 3." />
    </div>
  );
}
