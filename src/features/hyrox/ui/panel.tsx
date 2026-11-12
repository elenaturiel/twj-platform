"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Download, Send } from "lucide-react";
import { queueMailing, saveHyroxEvent, updateWaitlistEntry } from "../staff-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Contact = {
  id: string;
  email: string | null;
  nivel: string | null;
  cuando: string | null;
  ubicacion: string | null;
  utm_source: string | null;
  status: string;
  created_at: string;
  isClient: boolean;
};

const STATUS: Record<string, string> = {
  subscribed: "Apuntado",
  contacted: "Contactado",
  converted: "Cliente",
  unsubscribed: "Baja",
  lead: "Sin email",
};

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function ContactsTable({
  rows,
  nivel,
  cuando,
}: {
  rows: Contact[];
  nivel: Record<string, string>;
  cuando: Record<string, string>;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  const emails = rows.map((r) => r.email).filter(Boolean) as string[];

  const download = () => {
    const lines = [
      ["email", "fecha", "nivel", "plazo", "banner", "utm_source", "estado"],
      ...rows.map((r) => [
        r.email,
        r.created_at.slice(0, 10),
        nivel[r.nivel ?? ""] ?? r.nivel,
        cuando[r.cuando ?? ""] ?? r.cuando,
        r.ubicacion,
        r.utm_source,
        STATUS[r.status] ?? r.status,
      ]),
    ];
    const blob = new Blob(["﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lista-hyrox-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!emails.length}
          onClick={async () => {
            await navigator.clipboard.writeText(emails.join(", "));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          <Copy className="size-4" /> {copied ? "Copiados" : "Copiar emails"}
        </Button>
        <Button size="sm" variant="outline" disabled={!rows.length} onClick={download}>
          <Download className="size-4" /> Descargar CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-2 font-medium">Email</th>
              <th className="px-2 font-medium">Fecha</th>
              <th className="px-2 font-medium">Nivel</th>
              <th className="px-2 font-medium">Plazo</th>
              <th className="px-2 font-medium">Banner</th>
              <th className="px-2 font-medium">Origen</th>
              <th className="pl-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="py-2 pr-2 font-medium">
                  {r.email}
                  {r.isClient ? (
                    <Badge variant="secondary" className="ml-2">
                      Ya es cliente
                    </Badge>
                  ) : null}
                </td>
                <td className="px-2 whitespace-nowrap text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("es-ES")}
                </td>
                <td className="px-2">{nivel[r.nivel ?? ""] ?? "–"}</td>
                <td className="px-2">{cuando[r.cuando ?? ""] ?? "–"}</td>
                <td className="px-2">{r.ubicacion ?? "–"}</td>
                <td className="px-2">{r.utm_source ?? "(directo)"}</td>
                <td className="pl-2">
                  <select
                    aria-label={`Estado de ${r.email}`}
                    className="h-8 rounded-md border border-input bg-background px-1 text-xs"
                    defaultValue={r.status}
                    onChange={(e) =>
                      start(async () => {
                        const res = await updateWaitlistEntry({ id: r.id, status: e.target.value as "subscribed" });
                        if (!res.ok) toast.error(res.error);
                        router.refresh();
                      })
                    }
                  >
                    {Object.entries(STATUS)
                      .filter(([k]) => k !== "lead")
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-3 text-muted-foreground">
                  Todavía no se ha apuntado nadie.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MailingForm({ nivel, cuando }: { nivel: Record<string, string>; cuando: Record<string, string> }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [fNivel, setFNivel] = useState<string[]>([]);
  const [fCuando, setFCuando] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirm("¿Enviar este email a la lista? No se puede deshacer.")) return;
        start(async () => {
          const r = await queueMailing({ subject, body, nivel: fNivel, cuando: fCuando });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message ?? "En cola");
          setSubject("");
          setBody("");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="ml-subject">Asunto</Label>
        <Input id="ml-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={200} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ml-body">Texto (línea en blanco = párrafo nuevo)</Label>
        <Textarea id="ml-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} required />
      </div>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">Solo a… (vacío = todos con consentimiento)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(nivel).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1.5">
              <input type="checkbox" checked={fNivel.includes(k)} onChange={() => toggle(fNivel, setFNivel, k)} /> {v}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(cuando).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1.5">
              <input type="checkbox" checked={fCuando.includes(k)} onChange={() => toggle(fCuando, setFCuando, k)} />{" "}
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Cada email lleva un enlace de baja. Solo se envía a quien dio su consentimiento.
      </p>
      <Button type="submit" disabled={pending}>
        <Send className="size-4" /> Enviar a la lista
      </Button>
    </form>
  );
}

export function EventForm({
  e,
}: {
  e?: { id: string; name: string; city: string | null; event_date: string; is_active: boolean };
}) {
  const router = useRouter();
  const [v, setV] = useState({
    name: e?.name ?? "HYROX",
    city: e?.city ?? "",
    event_date: e?.event_date ?? "",
    is_active: e?.is_active ?? true,
  });
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          const r = await saveHyroxEvent({ id: e?.id, ...v });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Evento guardado");
          router.refresh();
        });
      }}
    >
      <Input
        value={v.name}
        onChange={(x) => setV({ ...v, name: x.target.value })}
        aria-label="Nombre"
        className="w-40"
      />
      <Input
        value={v.city}
        onChange={(x) => setV({ ...v, city: x.target.value })}
        placeholder="Ciudad"
        aria-label="Ciudad"
        className="w-36"
      />
      <Input
        type="date"
        value={v.event_date}
        onChange={(x) => setV({ ...v, event_date: x.target.value })}
        aria-label="Fecha"
        className="w-40"
        required
      />
      <label className="flex items-center gap-1.5 text-sm">
        <Switch checked={v.is_active} onCheckedChange={(c) => setV({ ...v, is_active: c })} /> Activo
      </label>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {e ? "Guardar" : "Añadir"}
      </Button>
    </form>
  );
}
