"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { submitStudentCard } from "./actions";

/** Sube la foto del carné al bucket privado student-cards/{client_id}/… */
export function StudentCardUpload({ clientId }: { clientId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onFile(file: File) {
    startTransition(async () => {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${clientId}/${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("student-cards").upload(path, file, { contentType: file.type });
      if (error) {
        toast.error("No se ha podido subir. Prueba con una foto más pequeña (máx. 8 MB).");
        return;
      }
      const res = await submitStudentCard(path);
      if (res.ok) {
        setDone(true);
        toast.success("Carné enviado. Jaime lo revisa y te avisamos.");
      } else toast.error(res.error);
    });
  }

  if (done) return <p className="text-sm text-success">Carné enviado. Pendiente de revisión.</p>;
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={pending}>
        {pending ? "Subiendo…" : "Subir foto del carné"}
      </Button>
    </>
  );
}
