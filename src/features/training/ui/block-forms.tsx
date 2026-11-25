"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copyBlockTo, createBlock, deleteTemplate } from "../staff-actions";

/** Nuevo bloque vacío (para un cliente o una plantilla). */
export function CreateBlockForm({
  clientId,
  templateId,
  baseHref,
  defaultStart,
}: {
  clientId: string | null;
  templateId: string | null;
  baseHref: string;
  defaultStart?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_100px_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await createBlock({
            clientId,
            templateId,
            name: String(f.get("name")),
            goal: "",
            startsOn: clientId ? String(f.get("startsOn") ?? "") || null : null,
            weeks: Number(f.get("weeks") ?? 4),
          });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Bloque creado");
          router.push(`${baseHref}/${r.id}`);
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="bname">Nuevo bloque</Label>
        <Input id="bname" name="name" placeholder="Bloque 1 · Fuerza base" required />
      </div>
      {clientId ? (
        <div className="space-y-1">
          <Label htmlFor="bstart">Empieza (lunes)</Label>
          <Input id="bstart" name="startsOn" type="date" defaultValue={defaultStart} />
        </div>
      ) : (
        <div />
      )}
      <div className="space-y-1">
        <Label htmlFor="bweeks">Semanas</Label>
        <Input id="bweeks" name="weeks" type="number" min={1} max={16} defaultValue={4} />
      </div>
      <Button type="submit" disabled={pending}>
        Crear
      </Button>
    </form>
  );
}

/** Asigna una plantilla a un cliente (copia completa, queda en borrador). */
export function AssignTemplateForm({
  clientId,
  templates,
  baseHref,
  defaultStart,
}: {
  clientId: string;
  templates: { blockId: string; name: string }[];
  baseHref: string;
  defaultStart?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!templates.length)
    return <p className="text-sm text-muted-foreground">Aún no hay plantillas. Crea una en Biblioteca → Plantillas.</p>;
  return (
    <form
      className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await copyBlockTo({
            blockId: String(f.get("template")),
            toClientId: clientId,
            startsOn: String(f.get("startsOn") ?? "") || null,
          });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Plantilla asignada (en borrador)");
          router.push(`${baseHref}/${r.id}`);
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="template">Desde plantilla</Label>
        <select
          id="template"
          name="template"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {templates.map((t) => (
            <option key={t.blockId} value={t.blockId}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tstart">Empieza</Label>
        <Input id="tstart" name="startsOn" type="date" defaultValue={defaultStart} />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Asignar
      </Button>
    </form>
  );
}

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-destructive"
      disabled={pending}
      onClick={() =>
        confirm("¿Borrar la plantilla? Los clientes que ya la tienen asignada no se ven afectados.") &&
        start(async () => {
          const r = await deleteTemplate(templateId);
          if (r.ok) router.refresh();
          else toast.error(r.error);
        })
      }
    >
      Borrar
    </Button>
  );
}
