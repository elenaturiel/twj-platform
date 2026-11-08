"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMPORT_FIELDS,
  parseWorkoutRows,
  suggestMapping,
  TEMPLATE_HEADERS,
  TEMPLATE_ROWS,
  type ColumnMapping,
  type ImportField,
} from "@/domain/training/import";
import { importParsedBlocks } from "../staff-actions";

type Sheet = { fileName: string; headers: string[]; rows: Record<string, unknown>[] };

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet(TEMPLATE_ROWS, { header: TEMPLATE_HEADERS });
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rutinas");
  XLSX.writeFile(wb, "plantilla-rutinas-twj.xlsx");
}

/** Asistente: subir Excel → asignar columnas → validar fila a fila → importar. */
export function ImportWizard({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [target, setTarget] = useState<string>(defaultClientId ?? "template");
  const [startsOn, setStartsOn] = useState("");
  const [pending, start] = useTransition();

  const result = useMemo(() => (sheet ? parseWorkoutRows(sheet.rows, mapping) : null), [sheet, mapping]);

  async function onFile(file: File) {
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
    const headers = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] ?? []).map(String).filter(Boolean);
    setSheet({ fileName: file.name, headers, rows });
    setMapping(suggestMapping(headers));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Sube el Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Una fila por ejercicio. Si tus columnas se llaman distinto, no pasa nada: las asignas en el paso 2.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="max-w-xs"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              aria-label="Archivo Excel"
            />
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="size-4" /> Descargar plantilla de ejemplo
            </Button>
          </div>
          {sheet ? (
            <p>
              <strong>{sheet.fileName}</strong>: {sheet.rows.length} filas, {sheet.headers.length} columnas.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {sheet ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Asigna las columnas</CardTitle>
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
      ) : null}

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Revisión</CardTitle>
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
                          fileName: sheet!.fileName,
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
      ) : null}
    </div>
  );
}
