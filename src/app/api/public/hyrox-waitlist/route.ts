import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Lista de espera HYROX. Acepta EXACTAMENTE lo que ya envía el formulario de
 * www.trainwithjaime.es/hyrox (para cambiar solo la URL del fetch):
 *   { action: "lead", id, ub, utm_source?, utm_medium?, utm_campaign?, nivel? | cuando? | email+consentimiento+website }
 *   { action: "event", name: "vista"|"paso1"|"paso2"|"envio", ub, utm_* }
 * CORS solo para la web (ajuste hyrox.allowed_origins). Anti-spam: campo trampa
 * `website`, límites de tamaño y de frecuencia por IP (hash, sin guardar la IP).
 */
const DEFAULT_ORIGINS = ["https://www.trainwithjaime.es", "https://trainwithjaime.es"];

async function allowedOrigins(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("hyrox_allowed_origins");
  const list = Array.isArray(data) ? (data as string[]) : DEFAULT_ORIGINS;
  return [...list, request.nextUrl.origin];
}

function cors(origin: string | null, allowed: string[]) {
  const h = new Headers({ Vary: "Origin" });
  if (origin && allowed.includes(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}

const utm = {
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
};
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("lead"),
    id: z.string().min(8).max(64),
    ub: z.string().max(40).optional(),
    nivel: z.string().max(20).optional(),
    cuando: z.string().max(20).optional(),
    email: z.string().max(254).optional(),
    consentimiento: z.boolean().optional(),
    website: z.string().max(200).optional(), // trampa para bots
    source: z.enum(["web", "app"]).optional(),
    ...utm,
  }),
  z.object({
    action: z.literal("event"),
    name: z.enum(["vista", "paso1", "paso2", "envio", "view", "click"]),
    id: z.string().max(64).optional(),
    ub: z.string().max(40).optional(),
    ...utm,
  }),
]);

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: cors(request.headers.get("origin"), await allowedOrigins(request)),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = await allowedOrigins(request);
  const headers = cors(origin, allowed);
  // Desde navegador, solo orígenes permitidos (sin Origin = servidor a servidor, p. ej. el /api/hyrox de la web)
  if (origin && !allowed.includes(origin)) return NextResponse.json({ ok: false }, { status: 403, headers });
  const text = await request.text();
  if (text.length > 4000) return NextResponse.json({ ok: false }, { status: 413, headers });
  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(text));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers });
  }
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers });
  const d = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const ipHash = ip ? createHash("sha256").update(`${ip}|${day}|twj-hyrox`).digest("hex").slice(0, 32) : null;
  const supabase = await createClient();

  if (d.action === "event") {
    await supabase.rpc("hyrox_track", {
      p_event: d.name,
      p_ub: d.ub,
      p_utm_source: d.utm_source,
      p_session: d.id,
      p_referrer: request.headers.get("referer") ?? undefined,
    });
    return NextResponse.json({ ok: true }, { headers });
  }
  // Bot: respondemos "ok" para no darle pistas, pero no guardamos nada
  if (d.website) return NextResponse.json({ ok: true }, { headers });
  if (d.email && !d.consentimiento)
    return NextResponse.json({ ok: false, error: "Falta el consentimiento" }, { status: 400, headers });

  const utmObj = Object.fromEntries(
    Object.entries({ utm_source: d.utm_source, utm_medium: d.utm_medium, utm_campaign: d.utm_campaign }).filter(
      ([, v]) => v,
    ),
  );
  const { data: ok } = await supabase.rpc("hyrox_capture", {
    p_session: d.id,
    p_ub: d.ub,
    p_nivel: d.nivel,
    p_cuando: d.cuando,
    p_email: d.email,
    p_consent: d.consentimiento ?? false,
    p_utm: utmObj,
    p_ip_hash: ipHash ?? undefined,
    p_source: d.source ?? (origin === request.nextUrl.origin ? "app" : "web"),
  });
  return NextResponse.json({ ok: Boolean(ok) }, { status: ok ? 200 : 429, headers });
}
