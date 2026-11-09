"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const euros = (c: number) =>
  (c / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Ingresos cobrados por mes: una serie (el título la nombra), barras finas con tooltip. */
export function RevenueChart({ data }: { data: { month: string; cents: number }[] }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(`${d.month}-15T12:00:00Z`)
      .toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" })
      .replace(".", ""),
  }));
  return (
    <figure aria-label="Ingresos por mes" className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => euros(Number(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(v) => [euros(Number(v)), "Cobrado"]}
          />
          <Bar dataKey="cents" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
