"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { publishLegal, saveLegalDraft } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Kind =
  | "privacy"
  | "legal_notice"
  | "terms"
  | "cookies"
  | "health_data"
  | "progress_photos"
  | "marketing"
  | "guardian"
  | "health_screening";

export function LegalEditor({
  kind,
  initial,
}: {
  kind: Kind;
  initial: { version: string; title: string; body: string };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveLegalDraft({ kind, version: v.version, title: v.title, body: v.body });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Borrador guardado");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor={`${kind}-v`}>Versión</Label>
          <Input
            id={`${kind}-v`}
            value={v.version}
            onChange={(e) => setV({ ...v, version: e.target.value })}
            placeholder="2027-01"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${kind}-t`}>Título</Label>
          <Input id={`${kind}-t`} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </div>
      </div>
      <Label htmlFor={`${kind}-b`}>Texto (Markdown)</Label>
      <Textarea
        id={`${kind}-b`}
        rows={10}
        value={v.body}
        onChange={(e) => setV({ ...v, body: e.target.value })}
        className="font-mono text-xs"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Guardar borrador
      </Button>
    </form>
  );
}

export function PublishButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Publicar ${label}? Pasará a ser la versión vigente.`)) return;
        start(async () => {
          const r = await publishLegal(id);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Publicada");
          router.refresh();
        });
      }}
    >
      Publicar
    </Button>
  );
}
