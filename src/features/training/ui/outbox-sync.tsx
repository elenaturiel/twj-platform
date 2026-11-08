"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveWorkoutLog } from "../client-actions";
import { pendingLogs, removeQueued } from "./offline-outbox";

/** Envía los entrenos guardados sin conexión en cuanto vuelve la red. */
export function OutboxSync() {
  const router = useRouter();
  useEffect(() => {
    let busy = false;
    const flush = async () => {
      if (busy || !navigator.onLine) return;
      busy = true;
      try {
        const queued = await pendingLogs();
        let sent = 0;
        for (const log of queued) {
          try {
            const res = await saveWorkoutLog(log);
            if (res.ok || !res.retryable) {
              await removeQueued(log.id);
              if (res.ok) sent++;
            }
          } catch {
            break; // sigue sin red de verdad
          }
        }
        if (sent) {
          toast.success(sent === 1 ? "Entreno sincronizado. Hoy ganas." : `${sent} entrenos sincronizados.`);
          router.refresh();
        }
      } finally {
        busy = false;
      }
    };
    void flush();
    window.addEventListener("online", flush);
    const t = setInterval(flush, 60_000);
    return () => {
      window.removeEventListener("online", flush);
      clearInterval(t);
    };
  }, [router]);
  return null;
}
