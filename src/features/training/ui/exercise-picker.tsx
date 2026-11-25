"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MODALITY_LABELS, type Modality } from "@/domain/training/prescription";

export type PickerExercise = { id: string; name: string; modality: string };

/** Buscador de ejercicios de la biblioteca (o tarea libre). */
export function ExercisePicker({
  exercises,
  modality,
  selectedId,
  freeName,
  onSelect,
}: {
  exercises: PickerExercise[];
  modality: Modality;
  selectedId: string | null;
  freeName: string;
  onSelect: (sel: { exerciseId: string | null; name: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return exercises
      .filter((e) => all || e.modality === modality)
      .filter((e) => !term || e.name.toLowerCase().includes(term))
      .slice(0, 50);
  }, [exercises, q, modality, all]);
  const selected = exercises.find((e) => e.id === selectedId);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar ejercicio…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar ejercicio"
        />
        <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Todas
        </label>
      </div>
      <ul className="max-h-44 overflow-y-auto rounded-md border text-sm" role="listbox" aria-label="Ejercicios">
        {list.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              role="option"
              aria-selected={e.id === selectedId}
              onClick={() => onSelect({ exerciseId: e.id, name: "" })}
              className={cn(
                "flex w-full justify-between px-3 py-1.5 text-left hover:bg-muted",
                e.id === selectedId && "bg-secondary font-medium",
              )}
            >
              <span>{e.name}</span>
              <span className="text-xs text-muted-foreground">{MODALITY_LABELS[e.modality as Modality]}</span>
            </button>
          </li>
        ))}
        {!list.length ? <li className="px-3 py-2 text-muted-foreground">Sin resultados.</li> : null}
      </ul>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {selected ? `Elegido: ${selected.name}` : "…o escribe una tarea libre (no está en la biblioteca):"}
        </p>
        {!selected ? (
          <Input
            placeholder="p. ej. Movilidad de cadera 5 min"
            value={freeName}
            onChange={(e) => onSelect({ exerciseId: null, name: e.target.value })}
          />
        ) : (
          <button type="button" className="text-xs underline" onClick={() => onSelect({ exerciseId: null, name: "" })}>
            Quitar y escribir una tarea libre
          </button>
        )}
      </div>
    </div>
  );
}
