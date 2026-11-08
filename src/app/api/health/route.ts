import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de despliegue: qué variables ve el servidor (sí/no, nunca valores)
 * y si la base de datos tiene las tablas y los planes.
 */
export async function GET() {
  const present = (name: string) => Boolean(process.env[name]);
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    SUPABASE_SECRET_KEY: present("SUPABASE_SECRET_KEY"),
    CRON_SECRET: present("CRON_SECRET"),
    PAYMENTS_MOCK: process.env.PAYMENTS_MOCK === "1",
    STRIPE_SECRET_KEY: present("STRIPE_SECRET_KEY"),
    RESEND_API_KEY: present("RESEND_API_KEY"),
  };

  let database: { ok: boolean; plans?: number; demoUsers?: boolean; error?: string } = {
    ok: false,
    error: "sin configurar",
  };
  if (hasSupabaseConfig() && env.SUPABASE_SECRET_KEY) {
    try {
      const admin = createAdminClient();
      const { count, error } = await admin.from("plans").select("id", { count: "exact", head: true });
      if (error) {
        database = {
          ok: false,
          error:
            error.code === "42P01" || error.message.includes("plans")
              ? "faltan las tablas (migraciones sin aplicar)"
              : "no conecta",
        };
      } else {
        const { count: demo } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("email", "jaime@twj.local");
        database = { ok: true, plans: count ?? 0, demoUsers: (demo ?? 0) > 0 };
      }
    } catch {
      database = { ok: false, error: "no conecta" };
    }
  }

  return NextResponse.json(
    { env, database, vercelEnv: process.env.VERCEL_ENV ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
