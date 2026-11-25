"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Evolución de una métrica (una sola serie: el título la nombra, sin leyenda).
 * Línea de 2 px, puntos de 8 px, rejilla discreta, objetivo como línea discontinua
 * y tooltip con el valor exacto al pasar el dedo.
 */
export function MetricChart({
  points,
  unit,
  target,
  name,
  scale = false,
}: {
  points: { date: string; value: number }[];
  unit: string | null;
  target: number | null;
  name: string;
  /** Escalas 1–10: eje fijo para no exagerar cambios pequeños */
  scale?: boolean;
}) {
  const data = points.map((p) => ({
    ...p,
    label: new Date(`${p.date}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
  }));
  const values = points.map((p) => p.value).concat(target ?? []);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || 1;

  return (
    <figure className="space-y-1" aria-label={`Evolución de ${name}`}>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              minTickGap={24}
            />
            <YAxis
              domain={scale ? [0, 10] : [Math.floor(min - pad), Math.ceil(max + pad)]}
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            {target != null ? (
              <ReferenceLine
                y={target}
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                label={{
                  value: `Objetivo ${target}`,
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "var(--muted-foreground)",
                }}
              />
            ) : null}
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v) => [`${Number(v).toLocaleString("es-ES")}${unit ? ` ${unit}` : ""}`, name]}
            />
            <Line
              type="linear"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {points.map((p) => `${p.date}: ${p.value}${unit ? ` ${unit}` : ""}`).join("; ")}
      </figcaption>
    </figure>
  );
}
