import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env.server";

let client: Stripe | null | undefined;

/** Cliente de Stripe, o null si no hay STRIPE_SECRET_KEY configurada. */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = serverEnv().STRIPE_SECRET_KEY;
    client = key ? new Stripe(key, { appInfo: { name: "twj-platform" } }) : null;
  }
  return client;
}

export type PaymentsMode = "stripe" | "mock";

/**
 * Stripe si hay clave. Si no, el simulador local (solo con PAYMENTS_MOCK=1 y
 * nunca en el entorno de producción de Vercel).
 */
export function paymentsMode(): PaymentsMode {
  const env = serverEnv();
  if (env.STRIPE_SECRET_KEY) return "stripe";
  if (env.PAYMENTS_MOCK === "1" && env.VERCEL_ENV !== "production") return "mock";
  throw new Error("Pagos sin configurar: define STRIPE_SECRET_KEY (o PAYMENTS_MOCK=1 en local).");
}
