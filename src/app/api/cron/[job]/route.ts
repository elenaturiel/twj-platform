import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { runBillingJob } from "@/features/billing/cron";
import { processOutbox, sendDigests } from "@/lib/notifications/worker";

export const runtime = "nodejs";
export const maxDuration = 60;

const JOBS = {
  billing: runBillingJob,
  notifications: (site: string) => processOutbox(site),
  digest: sendDigests,
} as const;

function authorized(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/**
 * Tareas programadas. Las llama Supabase pg_cron (POST) o Vercel Cron (GET),
 * siempre con `Authorization: Bearer $CRON_SECRET`.
 */
async function handler(request: NextRequest, { params }: RouteContext<"/api/cron/[job]">) {
  if (!authorized(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { job } = await params;
  const fn = JOBS[job as keyof typeof JOBS];
  if (!fn) return NextResponse.json({ error: "Tarea desconocida" }, { status: 404 });
  const result = await fn(request.nextUrl.origin);
  return NextResponse.json({ job, result });
}

export { handler as GET, handler as POST };
