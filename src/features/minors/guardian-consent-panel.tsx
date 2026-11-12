"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Download, MessageCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import type { GuardianConsentState } from "@/domain/minors/consent";
import { submitGuardianDocument } from "./actions";

/**
 * Lo que ve un menor hasta que Jaime aprueba la autorización firmada de su tutor/a:
 * descargar el PDF con sus datos → firmarlo → subirlo (o mandárselo a Jaime).
 */
export function GuardianConsentPanel({
  clientId,
  state,
  whatsapp,
}: {
  clientId: string;
  state: GuardianConsentState;
  whatsapp: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(state === "in_review");

  function onFile(file: File) {
    if (file.size > 20 * 1024 * 1024) return void toast.error("El archivo pesa demasiado (máx. 20 MB).");
    start(async () => {
      const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const path = `${clientId}/autorizacion-tutor-${Date.now()}.${ext}`;
      const { error } = await createClient()
        .storage.from("documents")
        .upload(path, file, { contentType: file.type || undefined });
      if (error) return void toast.error("No se ha podido subir. Prueba con una foto o un PDF (máx. 20 MB).");
      const r = await submitGuardianDocument(path);
      if (!r.ok) return void toast.error(r.error);
      setSent(true);
      toast.success("Enviada. Jaime la revisa y te avisamos.");
    });
  }

  // Si se eligió el archivo antes de que la página terminara de cargar (conexión lenta)
  useEffect(() => {
    const f = input.current?.files?.[0];
    if (f) onFile(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  const wa = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hola Jaime, te mando la autorización firmada de mi tutor/a.")}`
    : null;

  return (
    <div className="space-y-4 text-sm">
      {sent ? (
        <p className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Autorización enviada. Jaime la está revisando: te avisamos en cuanto puedas empezar.
        </p>
      ) : null}
      <ol className="space-y-3">
        <li className="space-y-2">
          <p>
            <strong>1. Descarga la autorización.</strong> Ya lleva tus datos.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href="/api/autorizacion-tutor" download>
              <Download className="size-4" aria-hidden /> Descargar autorización (PDF)
            </a>
          </Button>
        </li>
        <li>
          <strong>2. Que la firme tu padre, madre o tutor/a.</strong> Impresa y firmada a mano, completando su DNI.
        </li>
        <li className="space-y-2">
          <p>
            <strong>3. Súbela firmada</strong> (foto o PDF){wa ? " o mándasela a Jaime por WhatsApp" : ""}.
          </p>
          <input
            ref={input}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            aria-label="Autorización firmada"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => input.current?.click()} disabled={pending}>
              <Upload className="size-4" aria-hidden />{" "}
              {pending ? "Subiendo…" : sent ? "Subir otra" : "Subir autorización firmada"}
            </Button>
            {wa ? (
              <Button asChild variant="outline" size="sm">
                <a href={wa} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" aria-hidden /> Mandar por WhatsApp
                </a>
              </Button>
            ) : null}
          </div>
        </li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Hasta que Jaime la apruebe no puedes empezar a entrenar: es obligatorio para menores de edad.
      </p>
    </div>
  );
}
