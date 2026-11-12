import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireScope } from "@/lib/auth/dal";
import { googleAuthUrl, googleConfigured } from "@/lib/google/calendar";

export const runtime = "nodejs";

/** Inicia la conexión del Google Calendar de Jaime (Meet automático en las citas). */
export async function GET(request: NextRequest) {
  await requireScope("settings");
  const back = new URL("/panel/agenda/disponibilidad", request.nextUrl.origin);
  if (!googleConfigured()) {
    back.searchParams.set("google", "sin-configurar");
    return NextResponse.redirect(back);
  }
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(`${request.nextUrl.origin}/api/google/callback`, state));
  res.cookies.set("twj_google_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/google",
  });
  return res;
}
