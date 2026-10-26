import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Comida" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Comida</h1>
      <EmptyState icon={Construction} title="Menú semanal y lista de la compra llegan en la Fase 4." />
    </div>
  );
}
