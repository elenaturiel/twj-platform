import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth/dal";
import { ConfirmingPayment } from "@/features/billing/confirming";

export const metadata: Metadata = { title: "Confirmando pago" };

export default async function ConfirmingPage() {
  const viewer = await getViewer();
  if (!viewer) {
    // Registro con confirmación de email activada: aún no hay sesión
    return (
      <div className="mx-auto max-w-md space-y-3 py-16 text-center">
        <h1 className="text-2xl font-bold">¡Pago recibido!</h1>
        <p className="text-muted-foreground">
          Te hemos mandado un email para confirmar tu cuenta. Ábrelo y entrarás directo a rellenar tu ficha.
        </p>
        <Link href="/login" className="underline">
          Ir a entrar
        </Link>
      </div>
    );
  }
  return <ConfirmingPayment />;
}
