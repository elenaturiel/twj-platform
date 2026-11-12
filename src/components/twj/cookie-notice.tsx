"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const KEY = "twj-cookie-notice";

/**
 * Aviso de cookies. La app solo usa cookies técnicas (sesión), exentas de
 * consentimiento: basta con informar. Si algún día se añade analítica, aquí
 * habría que pedir consentimiento antes de cargarla.
 */
export function CookieNotice() {
  const pathname = usePathname();
  // En el servidor y si falla el almacenamiento, no se muestra
  const seen = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return Boolean(localStorage.getItem(KEY));
      } catch {
        return true;
      }
    },
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  if (seen || dismissed || pathname.startsWith("/embed")) return null;
  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg rounded-2xl border bg-background/95 p-3 text-sm shadow-lg backdrop-blur lg:bottom-4"
    >
      <p>
        Solo usamos cookies técnicas para que puedas iniciar sesión. Sin analítica ni publicidad.{" "}
        <Link href="/legal/cookies" className="underline">
          Más info
        </Link>
      </p>
      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            try {
              localStorage.setItem(KEY, new Date().toISOString());
            } catch {}
            setDismissed(true);
          }}
        >
          Entendido
        </Button>
      </div>
    </div>
  );
}
