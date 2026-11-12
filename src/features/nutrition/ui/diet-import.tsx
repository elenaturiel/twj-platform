"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseDietRows } from "@/domain/nutrition/import";
import { SLOT_LABELS } from "@/domain/nutrition/macros";
import { mondayOf } from "@/domain/training/week";
import { importDietPlan } from "../import-actions";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Dieta: revisión fila a fila → menú en borrador para un cliente o plantilla de menú. */
export function DietImport({
  clients,
  defaultClientId,
  sheet,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  sheet: { fileName: string; headers: string[]; rows: Record<string, unknown>[] };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string>(defaultClientId ?? "template");
  const [date, setDate] = useState("");
  const [templateName, setTemplateName] = useState(sheet.fileName.replace(/\.[^.]+$/, ""));
  const result = useMemo(() => parseDietRows(sheet.rows, sheet.headers), [sheet]);
  const weekStart = date ? mondayOf(date) : "";

  if (!result.rowCount && !result.errors.length)
    return <p className="text-sm text-muted-foreground">La pestaña «Dieta» está vacía.</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revisión de la dieta</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {result.errors.length ? (
          <>
            <p className="font-medium text-destructive">
              {result.errors.length} {result.errors.length === 1 ? "problema" : "problemas"}. Corrígelos en el Excel y
              vuelve a subirlo.
            </p>
            <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
              {result.errors.slice(0, 200).map((e, i) => (
                <li key={i}>
                  {e.row ? <strong>Fila {e.row}:</strong> : null} {e.message}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="font-medium text-success">Todo correcto. Se va a crear:</p>
            <ul className="space-y-2">
              {result.weeks.map((w) => (
                <li key={w.weekIndex} className="rounded-lg border p-2">
                  <strong>Semana {w.weekIndex + 1}</strong>
                  <ul className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    {w.days.map((d) => (
                      <li key={d.dayIndex}>
                        {DAYS[d.dayIndex]}: {d.meals.map((m) => m.title ?? SLOT_LABELS[m.slot]).join(" · ")}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground">
              {result.foods.length} alimentos distintos. Los que no estén en tu base se crearán sin datos nutricionales
              para que los completes en Biblioteca → Alimentos.
            </p>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div className="space-y-1">
                <Label htmlFor="dtarget">Importar como</Label>
                <select
                  id="dtarget"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="template">Plantilla de menú (para asignar después)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      Menú de {c.name} (en borrador)
                    </option>
                  ))}
                </select>
              </div>
              {target !== "template" ? (
                <div className="space-y-1">
                  <Label htmlFor="dstart">Semana 1 empieza</Label>
                  <Input id="dstart" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="dname">Nombre de la plantilla</Label>
                  <Input id="dname" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                </div>
              )}
              <Button
                disabled={pending || (target !== "template" && !weekStart)}
                onClick={() =>
                  start(async () => {
                    const r = await importDietPlan({
                      weeks: result.weeks,
                      clientId: target === "template" ? null : target,
                      weekStart: target === "template" ? null : weekStart,
                      templateName,
                      fileName: sheet.fileName,
                    });
                    if (!r.ok) return void toast.error(r.error);
                    toast.success(
                      `${r.plans === 1 ? "Menú importado" : `${r.plans} semanas importadas`} en borrador` +
                        (r.newFoods.length ? ` · ${r.newFoods.length} alimentos nuevos por completar` : ""),
                    );
                    router.push(
                      target === "template"
                        ? `/panel/biblioteca/menus/${r.planId}`
                        : `/panel/clientes/${target}/nutricion`,
                    );
                  })
                }
              >
                {pending ? "Importando…" : "Importar dieta"}
              </Button>
            </div>
            {target !== "template" && weekStart ? (
              <p className="text-xs text-muted-foreground">
                La semana 1 es la del lunes {new Date(`${weekStart}T12:00:00Z`).toLocaleDateString("es-ES")}.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
