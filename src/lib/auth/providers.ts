import "server-only";
import { publicEnv } from "@/lib/env";

/**
 * ¿Está activado el inicio de sesión con Google en Supabase? Mientras no se configure
 * (Supabase → Auth → Providers → Google) el botón no se enseña: daría error.
 */
export async function googleLoginEnabled(): Promise<boolean> {
  try {
    const env = publicEnv();
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { external?: Record<string, boolean> };
    return data.external?.google === true;
  } catch {
    return false;
  }
}
