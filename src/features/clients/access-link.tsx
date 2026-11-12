"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, MessageCircle } from "lucide-react";
import { getAccessLink } from "./staff-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function waLink(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Enlace de acceso listo para copiar o mandar por WhatsApp. */
export function AccessLinkShare({ link, name, phone }: { link: string; name: string; phone: string | null }) {
  const text = `¡Hola ${name.split(" ")[0]}! Aquí tienes tu acceso a la app de Train with Jaime. Entra, pon tu contraseña y a por ello: ${link}`;
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted p-2 font-mono text-xs break-all">{link}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            toast.success("Enlace copiado");
          }}
        >
          <Copy className="size-4" /> Copiar enlace
        </Button>
        <Button asChild>
          <a href={waLink(phone, text)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" /> Enviar por WhatsApp
          </a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Es personal y de un solo uso. Si caduca o se pierde, genera otro desde su ficha.
      </p>
    </div>
  );
}

/** Botón de la ficha: genera un enlace nuevo para entrar o poner contraseña. */
export function AccessLinkButton({ clientId, name }: { clientId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ link: string; phone: string | null } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setData(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await getAccessLink(clientId);
              if (!r.ok) {
                setOpen(false);
                return void toast.error(r.error);
              }
              setData({ link: r.link, phone: r.phone });
            })
          }
        >
          <KeyRound className="size-4" /> Enlace de acceso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enlace de acceso para {name}</DialogTitle>
          <DialogDescription>Con él entra y pone (o cambia) su contraseña.</DialogDescription>
        </DialogHeader>
        {data ? (
          <AccessLinkShare link={data.link} name={name} phone={data.phone} />
        ) : (
          <p className="text-sm text-muted-foreground">Generando…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
