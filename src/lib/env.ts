import { z } from "zod";

// Variables públicas (disponibles en el navegador). Next las inyecta en build,
// por eso se leen una a una y no con process.env completo.
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

function readPublicEnv() {
  return {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

let cached: z.infer<typeof publicSchema> | undefined;

/**
 * Se valida al usarse (no al importar), para que `next build` no falle si
 * faltan variables: el error aparece en tiempo de ejecución con un mensaje claro.
 */
export function publicEnv() {
  if (!cached) {
    const parsed = publicSchema.safeParse(readPublicEnv());
    if (!parsed.success) {
      const missing = parsed.error.issues.map((i) => String(i.path[0])).join(", ");
      throw new Error(`Configuración incompleta: revisa ${missing} en las variables de entorno.`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function hasSupabaseConfig() {
  return publicSchema.safeParse(readPublicEnv()).success;
}
