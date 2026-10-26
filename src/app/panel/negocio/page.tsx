import { Construction } from "lucide-react";
import { EmptyState } from "@/components/twj/empty-state";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <EmptyState
        icon={Construction}
        title="MRR, ingresos por plan, churn, LTV y exportación CSV: llega en la Fase 8."
      />
    </div>
  );
}
