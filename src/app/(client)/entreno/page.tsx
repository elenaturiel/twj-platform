import type { Metadata } from "next";
import { Construction } from "lucide-react";
import { EmptyState } from "@/components/twj/empty-state";

export const metadata: Metadata = { title: "Entreno" };

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">Entreno</h1>
      <EmptyState icon={Construction} title="Biblioteca, bloques y registro de entrenos llegan en la Fase 2." />
    </div>
  );
}
