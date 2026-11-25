"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { requestDeletion, updateOptionalConsent } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ConsentToggle({
  kind,
  label,
  description,
  granted,
}: {
  kind: "marketing" | "progress_photos";
  label: string;
  description: string;
  granted: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(granted);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-3 py-2">
      <Switch
        checked={on}
        disabled={pending}
        onCheckedChange={(v) =>
          start(async () => {
            setOn(v);
            const r = await updateOptionalConsent(kind, v);
            if (!r.ok) {
              setOn(!v);
              return void toast.error(r.error);
            }
            toast.success("Guardado");
            router.refresh();
          })
        }
        aria-label={label}
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function DownloadData() {
  return (
    <Button asChild variant="outline">
      <a href="/api/me/export" download>
        <Download className="size-4" /> Descargar mis datos (JSON)
      </a>
    </Button>
  );
}

export function DeleteAccount({ pending: alreadyPending }: { pending: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  if (alreadyPending)
    return (
      <p className="text-sm text-muted-foreground">
        Tu solicitud de eliminación está en trámite. Te avisaremos al terminar.
      </p>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="px-0 text-destructive">
          Eliminar mi cuenta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
          <DialogDescription>
            Borraremos tus datos personales y de salud, fotos, mensajes y registros. Los pagos se conservan de forma
            anónima porque la ley nos obliga a guardarlos. Si tienes una suscripción activa, la daremos de baja antes.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="¿Nos cuentas por qué? (opcional)"
          aria-label="Motivo"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Mejor no
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await requestDeletion(reason);
                if (!r.ok) return void toast.error(r.error);
                toast.success(r.message ?? "Solicitud enviada");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Pedir la eliminación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
