import { Construction } from "lucide-react";
import { EmptyState } from "@/components/twj/empty-state";

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <EmptyState
        icon={Construction}
        title="Calendario de videollamadas, disponibilidad y Google Meet: llega en la Fase 5."
      />
    </div>
  );
}
