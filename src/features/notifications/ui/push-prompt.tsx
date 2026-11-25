"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { PushToggle } from "./push-toggle";

const KEY = "twj-push-prompt-dismissed";

/**
 * En la pantalla principal: si este dispositivo aún no tiene los avisos activados,
 * lo propone (en iPhone explica cómo instalar la app primero). Se puede cerrar.
 */
export function PushPrompt({
  vapidPublicKey,
  audience,
}: {
  vapidPublicKey: string | null;
  audience: "client" | "staff";
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!vapidPublicKey) return;
    let dismissed = false;
    try {
      dismissed = Number(localStorage.getItem(KEY) ?? 0) > Date.now();
    } catch {
      /* sin almacenamiento: se enseña */
    }
    if (dismissed) return;
    (async () => {
      if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
      const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration("/") : undefined;
      const sub = await reg?.pushManager?.getSubscription();
      if (!sub) setShow(true);
    })().catch(() => setShow(true));
  }, [vapidPublicKey]);

  if (!show) return null;
  return (
    <section
      aria-label="Activar avisos"
      className="relative space-y-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm"
    >
      <button
        type="button"
        aria-label="Ahora no"
        className="absolute top-2 right-2 rounded p-1 text-muted-foreground hover:bg-muted"
        onClick={() => {
          try {
            localStorage.setItem(KEY, String(Date.now() + 7 * 86_400_000));
          } catch {
            /* nada */
          }
          setShow(false);
        }}
      >
        <X className="size-4" />
      </button>
      <p className="flex items-center gap-2 pr-6 font-semibold">
        <BellRing className="size-4 text-accent" aria-hidden /> Activa los avisos en este móvil
      </p>
      <p className="text-muted-foreground">
        {audience === "client"
          ? "Para enterarte al momento de tu entreno, tus citas, los check-ins y las respuestas de Jaime."
          : "Para enterarte al momento de mensajes, check-ins, reservas, pagos y solicitudes."}
      </p>
      <PushToggle vapidPublicKey={vapidPublicKey} showTest={false} onActivated={() => setShow(false)} />
    </section>
  );
}
