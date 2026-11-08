"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { fillTemplate, toParagraphs } from "@/lib/email/templates";
import { updateTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SAMPLE: Record<string, string> = {
  nombre: "Lucía",
  cliente: "Lucía Martín",
  plan: "MVP",
  enlace: "https://app.trainwithjaime.es/…",
  fecha: "lunes, 16 de noviembre",
  importe: "89,00 €",
  semana: "16 nov",
};

export function TemplateEditor({
  t,
}: {
  t: { key: string; subject: string | null; body: string; variables: string[]; description: string | null };
}) {
  const [subject, setSubject] = useState(t.subject ?? "");
  const [body, setBody] = useState(t.body.replace(/\\n/g, "\n"));
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const vars = Object.fromEntries(t.variables.map((v) => [v, SAMPLE[v] ?? `[${v}]`]));
  const unknown = [...body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
    .map((m) => m[1]!)
    .filter((v) => !t.variables.includes(v));

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateTemplate({ key: t.key, subject, body });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Plantilla guardada");
        });
      }}
    >
      {t.description ? <p className="text-sm text-muted-foreground">{t.description}</p> : null}
      <Label htmlFor={`s-${t.key}`}>Asunto</Label>
      <Input id={`s-${t.key}`} value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Label htmlFor={`b-${t.key}`}>Texto (línea en blanco = párrafo nuevo)</Label>
      <Textarea id={`b-${t.key}`} rows={7} value={body} onChange={(e) => setBody(e.target.value)} />
      {t.variables.length ? (
        <p className="text-xs text-muted-foreground">
          Variables:{" "}
          {t.variables.map((v) => (
            <code key={v} className="mr-1 rounded bg-muted px-1">{`{{${v}}}`}</code>
          ))}
        </p>
      ) : null}
      {unknown.length ? (
        <p className="text-xs text-warning">Estas variables no existen y saldrán vacías: {unknown.join(", ")}</p>
      ) : null}
      {preview ? (
        <div className="space-y-2 rounded-xl border bg-muted/40 p-3 text-sm">
          <p className="font-semibold">{fillTemplate(subject, vars)}</p>
          {toParagraphs(fillTemplate(body, vars)).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setPreview(!preview)}>
          {preview ? "Ocultar vista previa" : "Vista previa"}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
