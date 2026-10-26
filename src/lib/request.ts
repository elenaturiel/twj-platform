import "server-only";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

/** Origen real de la petición (sirve en previews de Vercel y en local). */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return host ? `${proto}://${host}` : publicEnv.NEXT_PUBLIC_SITE_URL;
}

export async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent") };
}
