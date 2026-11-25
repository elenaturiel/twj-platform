"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTemplate } from "./actions";

export function NewTemplateForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await createTemplate(String(f.get("name")), Number(f.get("weeks") ?? 4));
          if (!r.ok) return void toast.error(r.error);
          router.push(`/panel/biblioteca/plantillas/${r.id}`);
        });
      }}
    >
      <Input
        name="name"
        placeholder="Iniciación running 8 semanas"
        required
        className="max-w-sm"
        aria-label="Nombre de la plantilla"
      />
      <Input name="weeks" type="number" min={1} max={16} defaultValue={4} className="w-20" aria-label="Semanas" />
      <Button type="submit" disabled={pending}>
        Crear plantilla
      </Button>
    </form>
  );
}
