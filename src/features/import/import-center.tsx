"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readImportWorkbook, type SheetData } from "@/lib/excel-import";
import { ImportWizard } from "@/features/training/ui/import-wizard";
import { DietImport } from "@/features/nutrition/ui/diet-import";

/** Un solo Excel (la plantilla): se lee la pestaña «Entreno» y la pestaña «Dieta». */
export function ImportCenter({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [file, setFile] = useState<{
    key: number;
    name: string;
    training: SheetData | null;
    diet: SheetData | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File) {
    setError(null);
    try {
      const { training, diet } = readImportWorkbook(await f.arrayBuffer());
      setFile({ key: Date.now(), name: f.name, training, diet });
    } catch {
      setError("No se ha podido leer el archivo. ¿Es un Excel (.xlsx)?");
      setFile(null);
    }
  }

  // Si el archivo se eligió antes de que la página terminara de cargar (conexión lenta)
  useEffect(() => {
    const f = input.current?.files?.[0];
    if (f) void onFile(f);
  }, []);

  const hasTraining = Boolean(file?.training?.rows.some((r) => Object.values(r).some((v) => String(v).trim())));
  const hasDiet = Boolean(file?.diet?.rows.some((r) => Object.values(r).some((v) => String(v).trim())));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Descarga la plantilla y rellénala</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Trae una pestaña de <strong>Entreno</strong> (una fila por ejercicio) y otra de <strong>Dieta</strong> (una
            fila por alimento), con desplegables de días, comidas y tu biblioteca de ejercicios y alimentos. Puedes
            rellenar una o las dos.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="/api/plantilla" download>
              <Download className="size-4" aria-hidden /> Descargar plantilla de Excel
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Súbela</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Input
            ref={input}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="max-w-xs"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            aria-label="Archivo Excel"
          />
          {error ? <p className="text-destructive">{error}</p> : null}
          {file ? (
            <p>
              <strong>{file.name}</strong>: {hasTraining ? "entreno" : "sin entreno"} ·{" "}
              {hasDiet ? "dieta" : "sin dieta"}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {file && !hasTraining && !hasDiet ? (
        <p className="text-sm text-destructive">
          El Excel está vacío: rellena la pestaña «Entreno» o «Dieta» de la plantilla.
        </p>
      ) : null}
      {file && hasTraining ? (
        <section className="space-y-2" aria-label="Entreno">
          <h2 className="text-xl font-bold">Entreno</h2>
          <ImportWizard
            key={`t${file.key}`}
            clients={clients}
            defaultClientId={defaultClientId}
            sheet={{ fileName: file.name, headers: file.training!.headers, rows: file.training!.rows }}
          />
        </section>
      ) : null}
      {file && hasDiet ? (
        <section className="space-y-2" aria-label="Dieta">
          <h2 className="text-xl font-bold">Dieta</h2>
          <DietImport
            key={`d${file.key}`}
            clients={clients}
            defaultClientId={defaultClientId}
            sheet={{ fileName: file.name, headers: file.diet!.headers, rows: file.diet!.rows }}
          />
        </section>
      ) : null}
    </div>
  );
}
