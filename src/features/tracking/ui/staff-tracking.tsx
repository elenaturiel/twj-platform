"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createCheckinNow,
  setCheckinSchedule,
  setClientCustomField,
  setClientMetric,
  staffPhotoUrls,
  type StaffTrackingResult,
} from "../staff-actions";
import { PhotoCompare, type Photo } from "./photos";

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

export type MetricRow = {
  id: string;
  name: string;
  unit: string | null;
  suggested_frequency: string;
  active: boolean;
  frequency: string | null;
  target_value: number | null;
  target_direction: string | null;
};

/** Activar métricas por cliente, con frecuencia y objetivo. */
export function ClientMetricsManager({ clientId, metrics }: { clientId: string; metrics: MetricRow[] }) {
  const { pending, run } = useRun();
  return (
    <ul className="divide-y text-sm">
      {metrics.map((m) => (
        <MetricRowEditor key={m.id} clientId={clientId} m={m} pending={pending} run={run} />
      ))}
    </ul>
  );
}

function MetricRowEditor({
  clientId,
  m,
  pending,
  run,
}: {
  clientId: string;
  m: MetricRow;
  pending: boolean;
  run: ReturnType<typeof useRun>["run"];
}) {
  const [freq, setFreq] = useState(m.frequency ?? m.suggested_frequency);
  const [target, setTarget] = useState(m.target_value == null ? "" : String(m.target_value));
  const [dir, setDir] = useState(m.target_direction ?? "");
  const save = (active: boolean) =>
    run(() =>
      setClientMetric({
        clientId,
        metricId: m.id,
        active,
        frequency: freq as "weekly",
        targetValue: target.trim() === "" ? null : Number(target.replace(",", ".")),
        targetDirection: (dir || null) as "up" | null,
      }),
    );
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <Switch checked={m.active} disabled={pending} onCheckedChange={(v) => save(v)} aria-label={`Activar ${m.name}`} />
      <span className="min-w-28 flex-1 font-medium">
        {m.name} {m.unit ? <span className="text-xs text-muted-foreground">({m.unit})</span> : null}
      </span>
      {m.active ? (
        <>
          <select
            aria-label="Frecuencia"
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="daily">Diaria</option>
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
          </select>
          <Input
            aria-label="Objetivo"
            placeholder="Objetivo"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="h-8 w-24 text-xs"
            inputMode="decimal"
          />
          <select
            aria-label="Dirección"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">—</option>
            <option value="down">Bajar</option>
            <option value="up">Subir</option>
            <option value="keep">Mantener</option>
          </select>
          <Button size="sm" variant="secondary" className="h-8" disabled={pending} onClick={() => save(true)}>
            Guardar
          </Button>
        </>
      ) : null}
    </li>
  );
}

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function CheckinScheduleForm({
  clientId,
  frequency,
  weekday,
  planDefault,
}: {
  clientId: string;
  frequency: number | null;
  weekday: number | null;
  planDefault: number | null;
}) {
  const { pending, run } = useRun();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const freq = String(f.get("freq") ?? "");
        const wd = String(f.get("weekday") ?? "");
        run(() => setCheckinSchedule(clientId, freq ? Number(freq) : null, wd === "" ? null : Number(wd)));
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="freq" className="text-xs">
          Cada (días)
        </Label>
        <Input
          id="freq"
          name="freq"
          type="number"
          min={1}
          max={60}
          defaultValue={frequency ?? ""}
          placeholder={planDefault ? `Plan: ${planDefault}` : "7"}
          className="w-28"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="weekday" className="text-xs">
          Día
        </Label>
        <select
          id="weekday"
          name="weekday"
          defaultValue={weekday ?? ""}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Por defecto (domingo)</option>
          {WEEKDAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Guardar
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => createCheckinNow(clientId), "Check-in pedido")}
      >
        Pedir check-in ahora
      </Button>
    </form>
  );
}

/** Fotos del cliente para staff: se cargan bajo demanda (acceso auditado). */
export function StaffPhotos({ clientId }: { clientId: string }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [pending, start] = useTransition();
  if (!photos) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => setPhotos(await staffPhotoUrls(clientId)))}
      >
        Ver fotos de progreso
      </Button>
    );
  }
  return <PhotoCompare photos={photos} />;
}

export type CustomFieldRow = {
  id: string;
  label: string;
  type: string;
  options: string[];
  client_editable: boolean;
  assigned: boolean;
  value: string;
};

export function CustomFieldsEditor({ clientId, fields }: { clientId: string; fields: CustomFieldRow[] }) {
  const { pending, run } = useRun();
  if (!fields.length)
    return <p className="text-sm text-muted-foreground">No hay campos personalizados. Créalos en Seguimiento.</p>;
  return (
    <ul className="divide-y text-sm">
      {fields.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center gap-2 py-2">
          <Switch
            checked={f.assigned}
            disabled={pending}
            onCheckedChange={(v) =>
              run(() => setClientCustomField({ clientId, fieldId: f.id, assigned: v, value: f.value }))
            }
            aria-label={`Asignar ${f.label}`}
          />
          <span className="min-w-28 flex-1">
            {f.label}{" "}
            <span className="text-xs text-muted-foreground">
              {f.client_editable ? "(lo edita el cliente)" : "(solo equipo)"}
            </span>
          </span>
          {f.assigned ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() =>
                  setClientCustomField({
                    clientId,
                    fieldId: f.id,
                    assigned: true,
                    value: String(new FormData(e.currentTarget).get("v") ?? ""),
                  }),
                );
              }}
            >
              {f.type === "select" ? (
                <select
                  name="v"
                  defaultValue={f.value}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <Input
                  name="v"
                  defaultValue={f.value}
                  type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                  className="h-8 w-40 text-xs"
                />
              )}
              <Button size="sm" variant="secondary" className="h-8" disabled={pending}>
                Guardar
              </Button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
