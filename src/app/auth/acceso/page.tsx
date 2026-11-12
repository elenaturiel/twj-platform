import type { Metadata } from "next";
import { AuthShell } from "@/features/auth/auth-shell";
import { verifyAccessLink } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tu acceso", robots: { index: false } };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function AccessLinkPage({ searchParams }: PageProps<"/auth/acceso">) {
  const sp = await searchParams;
  const tokenHash = str(sp.token_hash);
  const type = str(sp.type);
  const next = str(sp.next);
  const recovery = type === "recovery";
  return (
    <AuthShell
      title={recovery ? "Recupera tu acceso" : "Bienvenido/a a TWJ"}
      subtitle={
        recovery
          ? "Pulsa el botón para elegir una contraseña nueva."
          : "Pulsa el botón para activar tu cuenta y elegir tu contraseña."
      }
    >
      {tokenHash && type ? (
        <form action={verifyAccessLink} className="space-y-3">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={next} />
          <Button type="submit" className="w-full">
            Continuar
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Este enlace no es válido. Pide uno nuevo a Jaime.</p>
      )}
    </AuthShell>
  );
}
