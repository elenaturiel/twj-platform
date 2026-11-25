import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentsMode } from "@/lib/payments/stripe";
import { formatEuros } from "@/lib/money";
import { completeMockCheckout } from "@/features/billing/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pago simulado" };

/** Sustituto de Stripe Checkout en local/E2E (PAYMENTS_MOCK=1). Nunca existe en producción. */
export default async function MockCheckoutPage({ searchParams }: PageProps<"/empezar/pago-simulado">) {
  let mode: string;
  try {
    mode = paymentsMode();
  } catch {
    notFound();
  }
  if (mode !== "mock") notFound();

  const { session } = await searchParams;
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("amount_cents, billing_interval, plans(name)")
    .eq("checkout_session_id", String(session))
    .maybeSingle();
  if (!sub) notFound();

  return (
    <div className="mx-auto max-w-sm space-y-6 text-center">
      <p className="rounded-lg bg-warning/20 p-2 text-xs font-semibold uppercase">
        Simulador de pagos · solo desarrollo
      </p>
      <h1 className="text-3xl font-extrabold">{sub.plans?.name}</h1>
      <p className="text-4xl font-extrabold tabular-nums">{formatEuros(sub.amount_cents)}</p>
      <p className="text-sm text-muted-foreground">{sub.billing_interval === "year" ? "Pago anual" : "Pago mensual"}</p>
      <form action={completeMockCheckout} className="space-y-2">
        <input type="hidden" name="session" value={String(session)} />
        <Button type="submit" name="outcome" value="paid" className="w-full" size="lg">
          Pagar (simulado)
        </Button>
        <Button type="submit" name="outcome" value="cancel" variant="ghost" className="w-full">
          Cancelar
        </Button>
      </form>
    </div>
  );
}
