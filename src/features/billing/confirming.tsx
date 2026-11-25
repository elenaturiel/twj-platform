"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signupStatus } from "./actions";

/** Espera a que el webhook confirme el pago y entra al onboarding. */
export function ConfirmingPayment() {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let tries = 0;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      const status = await signupStatus();
      if (status === "active") {
        router.replace("/onboarding");
        return;
      }
      if (++tries >= 30) {
        setTimedOut(true);
        return;
      }
      setTimeout(tick, 2000);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center" role="status" aria-live="polite">
      {timedOut ? (
        <>
          <h1 className="text-2xl font-bold">Esto está tardando más de la cuenta</h1>
          <p className="max-w-sm text-muted-foreground">
            Tu pago está en camino. Te mandamos un email en cuanto se confirme. Si en unos minutos no llega, escribe a
            Jaime.
          </p>
        </>
      ) : (
        <>
          <Loader2 className="size-10 animate-spin text-accent" aria-hidden />
          <h1 className="text-2xl font-bold">Confirmando tu pago…</h1>
          <p className="text-muted-foreground">¿Y tú, quieres ganar? En unos segundos estás dentro.</p>
        </>
      )}
    </div>
  );
}
