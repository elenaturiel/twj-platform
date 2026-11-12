"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { progressToTarget, seriesChange } from "@/domain/tracking/progress";
import type { ActiveMetric } from "../queries";
import { addMetricEntry, deleteMetricEntry } from "../client-actions";
import { MetricChart } from "./metric-chart";

const FREQ = { daily: "a diario", weekly: "cada semana", monthly: "cada mes" } as Record<string, string>;

/** Tarjeta de una métrica: último valor, objetivo, gráfica e introducir el dato de hoy. */
export function MetricCard({ metric, today, editable }: { metric: ActiveMetric; today: string; editable: boolean }) {
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [showAll, setShowAll] = useState(false);
  const [pending, start] = useTransition();
  const numeric = metric.entries
    .filter((e) => e.value_num != null)
    .map((e) => ({ date: e.recorded_on, value: e.value_num! }));
  const last = metric.entries.at(-1);
  const change = seriesChange(numeric);
  const progress = progressToTarget(numeric[0]?.value ?? null, numeric.at(-1)?.value ?? null, metric.target_value);

  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{metric.name}</h3>
          <p className="text-xs text-muted-foreground">Registrar {FREQ[metric.frequency] ?? metric.frequency}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold tabular-nums">
            {last ? (last.value_num != null ? last.value_num.toLocaleString("es-ES") : "✓") : "—"}
            {last?.value_num != null && metric.unit ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">{metric.unit}</span>
            ) : null}
          </p>
          {change ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {change.absolute > 0 ? "+" : ""}
              {change.absolute.toLocaleString("es-ES")} desde el inicio
            </p>
          ) : null}
        </div>
      </header>

      {metric.target_value != null && progress != null ? (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Objetivo: {metric.target_value.toLocaleString("es-ES")} {metric.unit}
            </span>
            <span>{progress} %</span>
          </div>
          <Progress value={progress} aria-label={`Progreso hacia el objetivo de ${metric.name}`} />
        </div>
      ) : null}

      {numeric.length >= 2 ? (
        <MetricChart
          points={numeric}
          unit={metric.unit}
          target={metric.target_value}
          name={metric.name}
          scale={metric.type === "scale"}
        />
      ) : null}

      {editable && metric.type !== "photo" ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await addMetricEntry({ metricId: metric.id, value, recordedOn: date });
              if (r.ok) {
                toast.success("Guardado. Hoy ganas.");
                setValue("");
              } else toast.error(r.error);
            });
          }}
        >
          <Input
            aria-label={`Nuevo valor de ${metric.name}`}
            inputMode={metric.type === "text" ? "text" : "decimal"}
            placeholder={metric.type === "scale" ? "1–10" : (metric.unit ?? "Valor")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
            required
          />
          <Input
            aria-label="Fecha"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-36"
          />
          <Button type="submit" disabled={pending || !value}>
            Guardar
          </Button>
        </form>
      ) : null}

      {metric.entries.length ? (
        <details open={showAll} onToggle={(e) => setShowAll((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Ver registros ({metric.entries.length})
          </summary>
          <ul className="mt-2 divide-y text-sm">
            {[...metric.entries].reverse().map((e) => (
              <li key={e.id} className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground">
                  {new Date(`${e.recorded_on}T12:00:00Z`).toLocaleDateString("es-ES")}
                </span>
                <span className="flex items-center gap-2 tabular-nums">
                  {e.value_num != null ? `${e.value_num.toLocaleString("es-ES")} ${metric.unit ?? ""}` : e.value_text}
                  {editable ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label="Borrar registro"
                      onClick={() => start(async () => void (await deleteMetricEntry(e.id)))}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
