"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCheckinTemplate, saveCustomField, saveMetricDefinition, type StaffTrackingResult } from "../staff-actions";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    run: (fn: () => Promise<StaffTrackingResult>, ok = "Guardado") =>
      start(async () => {
        const r = await fn();
        if (r.ok) {
          toast.success(ok);
          router.refresh();
        } else toast.error(r.error);
      }),
  };
}

const sel = "border-input bg-background h-9 rounded-md border px-2 text-sm";

type Def = {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  suggested_frequency: string;
  is_active: boolean;
  is_system: boolean;
};

export function MetricCatalog({ defs }: { defs: Def[] }) {
  const { pending, run } = useRun();
  return (
    <div className="space-y-2">
      {[...defs, null].map((d, i) => (
        <form
          key={d?.id ?? `new-${i}`}
          className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() =>
              saveMetricDefinition({
                id: d?.id,
                name: String(f.get("name")),
                type: f.get("type") as "number",
                unit: String(f.get("unit") ?? "") || null,
                suggested_frequency: f.get("freq") as "weekly",
                is_active: f.get("active") === "on",
              }),
            );
          }}
        >
          <Input
            name="name"
            defaultValue={d?.name}
            placeholder={d ? "" : "Nueva métrica (p. ej. Perímetro de gemelo)"}
            aria-label="Nombre"
            required
          />
          <select
            name="type"
            defaultValue={d?.type ?? "number"}
            className={sel}
            aria-label="Tipo"
            disabled={d?.is_system}
          >
            <option value="number">Número</option>
            <option value="scale">Escala 1–10</option>
            <option value="text">Texto</option>
            <option value="photo">Foto</option>
          </select>
          <Input name="unit" defaultValue={d?.unit ?? ""} placeholder="Unidad" aria-label="Unidad" />
          <select
            name="freq"
            defaultValue={d?.suggested_frequency ?? "weekly"}
            className={sel}
            aria-label="Frecuencia sugerida"
          >
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox name="active" defaultChecked={d?.is_active ?? true} /> Activa
          </label>
          <Button size="sm" variant={d ? "secondary" : "default"} disabled={pending}>
            {d ? "Guardar" : "Añadir"}
          </Button>
        </form>
      ))}
    </div>
  );
}

type Question = { key: string; label: string; type: "text" | "scale" | "number" | "yesno"; required: boolean };

export function CheckinTemplateEditor({
  template,
}: {
  template: { id: string; name: string; questions: Question[]; include_metrics: boolean; include_photos: boolean };
}) {
  const { pending, run } = useRun();
  const [name, setName] = useState(template.name);
  const [qs, setQs] = useState<Question[]>(template.questions);
  const [metrics, setMetrics] = useState(template.include_metrics);
  const [photos, setPhotos] = useState(template.include_photos);
  const upd = (i: number, patch: Partial<Question>) =>
    setQs((cur) => cur.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) =>
    setQs((cur) => {
      const n = [...cur];
      const t = n[i + d];
      if (!t) return cur;
      n[i + d] = n[i]!;
      n[i] = t;
      return n;
    });

  return (
    <div className="space-y-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Nombre de la plantilla"
        className="max-w-sm"
      />
      <ol className="space-y-2">
        {qs.map((q, i) => (
          <li key={q.key} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
            <Input
              value={q.label}
              onChange={(e) => upd(i, { label: e.target.value })}
              className="min-w-60 flex-1"
              aria-label={`Pregunta ${i + 1}`}
            />
            <select
              value={q.type}
              onChange={(e) => upd(i, { type: e.target.value as Question["type"] })}
              className={sel}
              aria-label="Tipo de respuesta"
            >
              <option value="scale">Escala 1–10</option>
              <option value="number">Número</option>
              <option value="yesno">Sí / No</option>
              <option value="text">Texto</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={q.required} onCheckedChange={(v) => upd(i, { required: v === true })} /> Obligatoria
            </label>
            <Button type="button" size="icon" variant="ghost" aria-label="Subir" onClick={() => move(i, -1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Bajar" onClick={() => move(i, 1)}>
              <ArrowDown className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Quitar"
              onClick={() => setQs((cur) => cur.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          setQs((cur) => [
            ...cur,
            { key: `q_${Date.now().toString(36)}`, label: "Nueva pregunta", type: "text", required: false },
          ])
        }
      >
        <Plus className="size-4" /> Pregunta
      </Button>
      <div className="flex flex-wrap gap-4 text-sm">
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={metrics} onCheckedChange={(v) => setMetrics(v === true)} /> Incluir las métricas activas
          del cliente
        </Label>
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={photos} onCheckedChange={(v) => setPhotos(v === true)} /> Permitir fotos
        </Label>
      </div>
      <Button
        disabled={pending}
        onClick={() =>
          run(() =>
            saveCheckinTemplate({
              id: template.id,
              name,
              questions: qs,
              includeMetrics: metrics,
              includePhotos: photos,
            }),
          )
        }
      >
        Guardar plantilla de check-in
      </Button>
    </div>
  );
}

type Field = {
  id: string;
  label: string;
  type: string;
  options: string[];
  client_editable: boolean;
  is_active: boolean;
};

export function CustomFieldsAdmin({ fields }: { fields: Field[] }) {
  const { pending, run } = useRun();
  return (
    <div className="space-y-2">
      {[...fields, null].map((f, i) => (
        <form
          key={f?.id ?? `new-${i}`}
          className="grid items-end gap-2 sm:grid-cols-[2fr_1fr_2fr_auto_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            run(() =>
              saveCustomField({
                id: f?.id,
                label: String(d.get("label")),
                type: d.get("type") as "text",
                options: String(d.get("options") ?? "")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
                client_editable: d.get("editable") === "on",
                is_active: d.get("active") === "on",
              }),
            );
          }}
        >
          <Input
            name="label"
            defaultValue={f?.label}
            placeholder={f ? "" : "Nuevo campo (p. ej. Talla de zapatilla)"}
            aria-label="Nombre del campo"
            required
          />
          <select name="type" defaultValue={f?.type ?? "text"} className={sel} aria-label="Tipo">
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="select">Selección</option>
            <option value="date">Fecha</option>
          </select>
          <Input
            name="options"
            defaultValue={f?.options.join(", ")}
            placeholder="Opciones (si es selección), separadas por comas"
            aria-label="Opciones"
          />
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox name="editable" defaultChecked={f?.client_editable ?? false} /> Lo edita el cliente
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox name="active" defaultChecked={f?.is_active ?? true} /> Activo
          </label>
          <Button size="sm" variant={f ? "secondary" : "default"} disabled={pending}>
            {f ? "Guardar" : "Añadir"}
          </Button>
        </form>
      ))}
    </div>
  );
}
