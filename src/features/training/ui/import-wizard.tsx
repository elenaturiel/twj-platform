"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMPORT_FIELDS,
  parseWorkoutRows,
  suggestMapping,
  type ColumnMapping,
  type ImportField,
} from "@/domain/training/import";
import { importParsedBlocks } from "../staff-actions";

export type Sheet = { fileName: string; headers: string[]; rows: Record<string, unknown>[] };

/** Entreno: columnas (automáticas con la plantilla) → validar fila a fila → importar. */
export function ImportWizard({
  clients,
  defaultClientId,
  sheet,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  sheet: Sheet;
}) {
  const router = useRouter();
  const [mapping, setMapping] = useState<ColumnMapping>(() => suggestMapping(sheet.headers));
  const [target, setTarget] = useState<string>(defaultClientId ?? "template");
  const [startsOn, setStartsOn] = useState("");
  const [pending, start] = useTransition();

  const result = useMemo(() => parseWorkoutRows(sheet.rows, mapping), [sheet, mapping]);
  // Con la plantilla todas las columnas se asignan solas: el paso se pliega
  const autoMapped = (Object.keys(IMPORT_FIELDS) as ImportField[]).every(
    (f) => !IMPORT_FIELDS[f].required || mapping[f],
  );

  return (
    <div className="space-y-4">
      {autoMapped ? (
        <details className="rounded-xl border bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            Columnas reconocidas automáticamente (ábrelo solo si tu Excel tiene otros nombres)
          </summary>
          <div className="mt-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Columnas</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(IMPORT_FIELDS) as ImportField[]).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">
                      {IMPORT_FIELDS[field].label}
                      {IMPORT_FIELDS[field].required ? " *" : ""}
                    </Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                    >
                      <option value="">— (no usar)</option>
                      {sheet.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </details>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Columnas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(IMPORT_FIELDS) as ImportField[]).map((field) => (
              <div key={field} className="space-y-1">
                <Label className="text-xs">
                  {IMPORT_FIELDS[field].label}
                  {IMPORT_FIELDS[field].required ? " *" : ""}
                </Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))}
                >
                  <option value="">— (no usar)</option>
                  {sheet.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revisión del entreno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {result.errors.length ? (
              <>
                <p className="font-medium text-destructive">
                  {result.errors.length} {result.errors.length === 1 ? "problema" : "problemas"}. Corrígelos en el Excel
                  (o el mapeo) y vuelve a subirlo.
                </p>
                <ul className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {result.errors.slice(0, 200).map((e, i) => (
                    <li key={i}>
                      {e.row ? <strong>Fila {e.row}:</strong> : <strong>Mapeo:</strong>} {e.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="font-medium text-success">Todo correcto. Se van a crear:</p>
                <ul className="list-inside list-disc">
                  {result.blocks.map((b) => (
                    <li key={b.name}>
                      <strong>{b.name}</strong>: {b.weeks.length} semanas,{" "}
                      {b.weeks.reduce((n, w) => n + w.sessions.length, 0)} sesiones,{" "}
                      {b.weeks.reduce(
                        (n, w) =>
                          n + w.sessions.reduce((m, s) => m + s.parts.reduce((k, p) => k + p.items.length, 0), 0),
                        0,
                      )}{" "}
                      ejercicios
                    </li>
                  ))}
                </ul>
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label htmlFor="target">Importar como</Label>
                    <select
                      id="target"
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="template">Plantillas (para asignar después)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          Plan de {c.name} (en borrador)
                        </option>
                      ))}
                    </select>
                  </div>
                  {target !== "template" ? (
                    <div className="space-y-1">
                      <Label htmlFor="istart">Empieza</Label>
                      <Input id="istart" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                    </div>
                  ) : (
                    <div />
                  )}
                  <Button
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await importParsedBlocks({
                          blocks: result.blocks,
                          clientId: target === "template" ? null : target,
                          startsOn: startsOn || null,
                          fileName: sheet.fileName,
                          rowCount: result.rowCount,
                        });
                        if (!r.ok) return void toast.error(r.error);
                        toast.success(`${r.created} bloque(s) importado(s)`);
                        router.push(
                          target === "template" ? "/panel/biblioteca/plantillas" : `/panel/clientes/${target}/entreno`,
                        );
                      })
                    }
                  >
                    {pending ? "Importando…" : "Importar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Los ejercicios que no estén en la biblioteca se crean como tarea con su nombre; luego puedes
                  enlazarlos a la biblioteca desde el editor.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      }
    </div>
  );
}
