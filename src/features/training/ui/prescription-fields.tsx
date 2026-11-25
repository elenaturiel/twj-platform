"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Modality, Prescription } from "@/domain/training/prescription";
import { formatDuration, parseDuration } from "@/domain/training/time";

type Field = {
  key: keyof Prescription;
  label: string;
  kind: "number" | "text" | "duration" | "select";
  placeholder?: string;
  options?: [string, string][];
};

const FIELDS: Record<Modality, Field[]> = {
  gym: [
    { key: "sets", label: "Series", kind: "number", placeholder: "4" },
    { key: "reps", label: "Reps", kind: "text", placeholder: "8-10" },
    { key: "load_kg", label: "Carga (kg)", kind: "number" },
    { key: "pct_rm", label: "% RM", kind: "number" },
    { key: "rpe", label: "RPE objetivo", kind: "number" },
    { key: "tempo", label: "Tempo", kind: "text", placeholder: "3-1-1-0" },
    { key: "rest_s", label: "Descanso", kind: "duration", placeholder: "2:00" },
  ],
  functional: [
    { key: "reps", label: "Reps", kind: "text", placeholder: "15" },
    { key: "load_kg", label: "Carga (kg)", kind: "number" },
    { key: "cal", label: "Calorías", kind: "number" },
    { key: "distance_m", label: "Distancia (m)", kind: "number" },
    { key: "duration_s", label: "Tiempo", kind: "duration", placeholder: "0:40" },
  ],
  running: [
    {
      key: "run_type",
      label: "Tipo",
      kind: "select",
      options: [
        ["rodaje", "Rodaje"],
        ["series", "Series"],
        ["tempo", "Tempo"],
        ["fartlek", "Fartlek"],
        ["tirada_larga", "Tirada larga"],
        ["calentamiento", "Calentamiento"],
        ["vuelta_calma", "Vuelta a la calma"],
      ],
    },
    { key: "repeat", label: "Repeticiones", kind: "number", placeholder: "6" },
    { key: "distance_m", label: "Distancia (m)", kind: "number", placeholder: "400" },
    { key: "duration_s", label: "Tiempo", kind: "duration", placeholder: "20:00" },
    { key: "pace_min_s", label: "Ritmo desde (/km)", kind: "duration", placeholder: "4:30" },
    { key: "pace_max_s", label: "Ritmo hasta (/km)", kind: "duration", placeholder: "4:45" },
    { key: "hr_zone", label: "Zona FC", kind: "text", placeholder: "Z2" },
    { key: "rest_s", label: "Recuperación", kind: "duration", placeholder: "1:30" },
  ],
  hyrox: [
    { key: "distance_m", label: "Distancia (m)", kind: "number" },
    { key: "reps", label: "Reps", kind: "text" },
    { key: "load_kg", label: "Carga (kg)", kind: "number" },
    { key: "target_split_s", label: "Parcial objetivo", kind: "duration", placeholder: "4:30" },
    { key: "repeat", label: "Repeticiones", kind: "number" },
    { key: "rest_s", label: "Descanso", kind: "duration" },
  ],
};

export function PrescriptionFields({
  modality,
  value,
  onChange,
  stations,
}: {
  modality: Modality;
  value: Prescription;
  onChange: (p: Prescription) => void;
  stations?: { key: string; name: string }[];
}) {
  const set = (key: keyof Prescription, v: unknown) =>
    onChange({ ...value, [key]: v === "" || v === null ? undefined : v });
  const fields = [...FIELDS[modality]];
  if (modality === "hyrox" && stations?.length) {
    fields.unshift({
      key: "station_key",
      label: "Estación",
      kind: "select",
      options: [["", "— (carrera u otro)"], ...stations.map((s) => [s.key, s.name] as [string, string])],
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {fields.map((f) => {
        const id = `p-${f.key}`;
        const current = value[f.key];
        return (
          <div key={f.key} className="space-y-1">
            <Label htmlFor={id} className="text-xs">
              {f.label}
            </Label>
            {f.kind === "select" ? (
              <select
                id={id}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={(current as string | undefined) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              >
                {f.key === "run_type" ? <option value="">—</option> : null}
                {f.options!.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            ) : f.kind === "duration" ? (
              <Input
                id={id}
                inputMode="numeric"
                placeholder={f.placeholder ?? "m:ss"}
                defaultValue={typeof current === "number" ? formatDuration(current) : ""}
                onBlur={(e) => set(f.key, parseDuration(e.target.value) ?? "")}
              />
            ) : (
              <Input
                id={id}
                inputMode={f.kind === "number" ? "decimal" : "text"}
                placeholder={f.placeholder}
                defaultValue={current === undefined ? "" : String(current)}
                onBlur={(e) => {
                  const raw = e.target.value.trim().replace(",", ".");
                  set(f.key, f.kind === "number" ? (raw === "" || Number.isNaN(Number(raw)) ? "" : Number(raw)) : raw);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
