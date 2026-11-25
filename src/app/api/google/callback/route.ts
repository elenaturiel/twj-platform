import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireScope } from "@/lib/auth/dal";
import { completeGoogleConnection } from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const viewer = await requireScope("settings");
  const back = new URL("/panel/agenda/disponibilidad", request.nextUrl.origin);
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const expected = request.cookies.get("twj_google_state")?.value ?? "";
  const code = request.nextUrl.searchParams.get("code");
  const valid =
    state.length > 0 && state.length === expected.length && timingSafeEqual(Buffer.from(state), Buffer.from(expected));
  if (!valid || !code) {
    back.searchParams.set("google", "error");
  } else {
    try {
      await completeGoogleConnection(viewer.id, code, `${request.nextUrl.origin}/api/google/callback`);
      back.searchParams.set("google", "ok");
    } catch (e) {
      console.error("[google] callback", e);
      back.searchParams.set("google", "error");
    }
  }
  const res = NextResponse.redirect(back);
  res.cookies.delete({ name: "twj_google_state", path: "/api/google" });
  return res;
}
