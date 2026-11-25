"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";
import { signedFileUrl } from "@/features/clients/staff-actions";
import { approveGuardian, registerClientDocument, rejectGuardianDocument } from "./actions";

const selectCls = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";

/** Abre un documento privado con un enlace temporal (queda registrado el acceso). */
export function OpenDocumentButton({
  clientId,
  path,
  label = "Ver",
}: {
  clientId: string;
  path: string;
  label?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const url = await signedFileUrl("documents", path, clientId);
          if (url) window.open(url, "_blank", "noopener");
          else toast.error("No se ha podido abrir el archivo.");
        })
      }
    >
      {pending ? "Abriendo…" : label}
    </Button>
  );
}

export function DownloadConsentButton({ clientId }: { clientId: string }) {
  return (
    <Button asChild size="sm" variant="outline">
      <a href={`/api/autorizacion-tutor?cliente=${clientId}`} download>
        <Download className="size-4" aria-hidden /> PDF para firmar
      </a>
    </Button>
  );
}

/** Aprobar la autorización firmada (el menor ya puede entrenar) o rechazarla con motivo. */
export function GuardianReview({ clientId, hasDocument }: { clientId: string; hasDocument: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Hecho");
        setRejecting(false);
        router.refresh();
      } else toast.error(r.error ?? "No se ha podido.");
    });

  if (!hasDocument) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => run(() => approveGuardian(clientId))}>
          Aprobar: ya puede entrenar
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(!rejecting)}>
          Rechazar
        </Button>
      </div>
      {rejecting ? (
        <div className="flex flex-wrap gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo: no se lee, falta la firma, falta el DNI…"
            aria-label="Motivo del rechazo"
            className="max-w-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => rejectGuardianDocument(clientId, reason))}
          >
            Rechazar y avisar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** El equipo sube un documento a la carpeta privada del cliente. */
export function StaffDocumentUpload({ clientId, minorPending }: { clientId: string; minorPending: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [kind, setKind] = useState(minorPending ? "guardian" : "other");
  const [title, setTitle] = useState(minorPending ? "Autorización del tutor (firmada)" : "");
  const [visible, setVisible] = useState(true);

  function onFile(file: File) {
    if (!title.trim()) return void toast.error("Ponle un nombre al documento.");
    if (file.size > 20 * 1024 * 1024) return void toast.error("Máximo 20 MB.");
    start(async () => {
      const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const prefix = kind === "guardian" ? "autorizacion-tutor" : "doc";
      const path = `${clientId}/${prefix}-${Date.now()}.${ext}`;
      const { error } = await createClient()
        .storage.from("documents")
        .upload(path, file, { contentType: file.type || undefined });
      if (error) return void toast.error("No se ha podido subir (PDF, JPG o PNG, máx. 20 MB).");
      const r = await registerClientDocument({
        clientId,
        path,
        title,
        kind: kind as "other",
        visibleToClient: visible,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Documento subido");
      if (input.current) input.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="doc-kind">Tipo</Label>
          <select
            id="doc-kind"
            className={selectCls}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              if (e.target.value === "guardian") setTitle("Autorización del tutor (firmada)");
            }}
          >
            <option value="guardian">Autorización del tutor (menores)</option>
            <option value="medical">Informe médico</option>
            <option value="invoice">Factura</option>
            <option value="consent">Consentimiento</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="doc-title">Nombre</Label>
          <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> El cliente puede
        verlo
      </Label>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        aria-label="Archivo del documento"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={pending}>
        <Upload className="size-4" aria-hidden /> {pending ? "Subiendo…" : "Subir documento"}
      </Button>
    </div>
  );
}
