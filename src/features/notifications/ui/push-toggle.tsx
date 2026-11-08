"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { subscribePush, unsubscribePush } from "../actions";
import { Button } from "@/components/ui/button";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return (
    (await navigator.serviceWorker.getRegistration("/")) ??
    (await navigator.serviceWorker.register("/sw.js", { scope: "/" }))
  );
}

/** Activa o desactiva los avisos push en ESTE dispositivo. */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  if (!vapidPublicKey)
    return <p className="text-sm text-muted-foreground">Los avisos push aún no están configurados en el servidor.</p>;
  if (state === "loading")
    return <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Cargando" />;
  if (state === "ios-install")
    return (
      <p className="text-sm text-muted-foreground">
        En iPhone, primero añade la app a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y ábrela
        desde ahí.
      </p>
    );
  if (state === "unsupported")
    return <p className="text-sm text-muted-foreground">Este navegador no admite avisos push.</p>;
  if (state === "denied")
    return (
      <p className="text-sm text-muted-foreground">
        Has bloqueado los avisos para esta web. Actívalos en los ajustes del navegador.
      </p>
    );

  return state === "on" ? (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const reg = await navigator.serviceWorker.getRegistration("/");
          const sub = await reg?.pushManager.getSubscription();
          if (sub) {
            await unsubscribePush(sub.endpoint);
            await sub.unsubscribe();
          }
          setState("off");
          toast.success("Avisos push desactivados en este dispositivo");
        })
      }
    >
      <BellOff className="size-4" /> Desactivar en este dispositivo
    </Button>
  ) : (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
            const reg = await registration();
            await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });
            const r = await subscribePush(sub.toJSON(), navigator.userAgent);
            if (!r.ok) return void toast.error(r.error);
            setState("on");
            toast.success("¡Listo! Te avisaremos en este dispositivo");
          } catch {
            toast.error("No se han podido activar los avisos.");
          }
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Activar avisos en este
      dispositivo
    </Button>
  );
}
