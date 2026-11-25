"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { dismissAccessRequest } from "./staff-actions";
import { Button } from "@/components/ui/button";

export type AccessRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  plan: string | null;
  created: string;
};

export function AccessRequestRow({ r, planName }: { r: AccessRequest; planName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const params = new URLSearchParams({
    nombre: r.name,
    email: r.email,
    solicitud: r.id,
    ...(r.phone ? { telefono: r.phone } : {}),
    ...(r.plan ? { plan: r.plan } : {}),
  });
  return (
    <li className="flex flex-wrap items-start gap-3 py-3 text-sm">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-medium">
          {r.name} ·{" "}
          <a className="underline" href={`mailto:${r.email}`}>
            {r.email}
          </a>{" "}
          {r.phone ? `· ${r.phone}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {planName ? `Quiere ${planName} · ` : ""}
          {r.created}
        </p>
        {r.message ? <p className="whitespace-pre-line text-muted-foreground">{r.message}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link href={`/panel/clientes/nuevo?${params}`}>Aceptar</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm(`¿Rechazar la solicitud de ${r.name}?`)) return;
            start(async () => {
              const res = await dismissAccessRequest(r.id);
              if (!res.ok) return void toast.error(res.error);
              router.refresh();
            });
          }}
        >
          Rechazar
        </Button>
      </div>
    </li>
  );
}
