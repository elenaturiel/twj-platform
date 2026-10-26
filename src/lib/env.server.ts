import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Simulador de pagos para desarrollo/E2E. Nunca se activa en producción.
  PAYMENTS_MOCK: z.enum(["0", "1"]).default("0"),
  VERCEL_ENV: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Train with Jaime <hola@mail.trainwithjaime.es>"),
  CRON_SECRET: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

let cached: z.infer<typeof serverSchema> | undefined;

// Lazy: así `next build` no falla por variables que solo hacen falta en runtime.
export function serverEnv() {
  cached ??= serverSchema.parse(process.env);
  return cached;
}
