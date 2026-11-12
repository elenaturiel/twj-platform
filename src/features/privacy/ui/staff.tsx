"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { processDeletion, rejectRequest } from "../actions";
import { Button } from "@/components/ui/button";

export function RequestActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Se borrarán los datos personales y de salud de ${name}. Los pagos se conservan. ¿Seguir?`))
            return;
          start(async () => {
            const r = await processDeletion(id);
            if (!r.ok) return void toast.error(r.error);
            toast.success(r.message ?? "Hecho");
            router.refresh();
          });
        }}
      >
        Anonimizar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          const notes = prompt("Motivo (se guarda en el registro):") ?? "";
          if (!notes) return;
          start(async () => {
            await rejectRequest(id, notes);
            router.refresh();
          });
        }}
      >
        Rechazar
      </Button>
    </div>
  );
}
