import { NextResponse } from "next/server";
import { configProblem, hasSupabaseConfig } from "@/lib/env";
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

  // Formato de las variables de Supabase (la URL es pública; de las claves solo el tipo)
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const sec = process.env.SUPABASE_SECRET_KEY ?? "";
  const keyKind = (k: string) =>
    k.startsWith("sb_publishable_")
      ? "publishable (correcto para NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
      : k.startsWith("sb_secret_")
        ? "secret (correcto para SUPABASE_SECRET_KEY)"
        : k.startsWith("eyJ")
          ? "clave JWT antigua (anon o service_role)"
          : k
            ? "formato no reconocido"
            : "vacía";
  const format = {
    supabaseUrl: rawUrl,
    supabaseUrlHasSpaces: rawUrl !== rawUrl.trim(),
    supabaseUrlLooksRight: /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(rawUrl.trim()),
    publishableKey: keyKind(pub.trim()),
    publishableKeyHasSpaces: pub !== pub.trim(),
    secretKey: keyKind(sec.trim()),
    secretKeyHasSpaces: sec !== sec.trim(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    configValid: hasSupabaseConfig(),
    configProblem: hasSupabaseConfig() ? null : configProblem(),
  };

  // Solo NOMBRES de variables parecidas (para detectar erratas), nunca valores
  const similarNames = Object.keys(process.env)
    .filter((k) => /supabase|cron|payments|stripe|resend/i.test(k))
    .map((k) => JSON.stringify(k))
    .sort();

  return NextResponse.json(
    {
      env,
      format,
      database,
      similarNames,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
