import type { NextRequest } from "next/server";
import { z } from "zod";
import { getClientContext, getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { guardianConsentPdf } from "@/features/minors/consent.server";

/**
 * PDF de la autorización del tutor con los datos del menor.
 * El menor descarga la suya; el equipo, la de cualquier cliente (?cliente=…).
 */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return new Response("Inicia sesión", { status: 401 });
  let clientId: string | null = null;
  if (viewer.role === "client") {
    const ctx = await getClientContext();
    clientId = ctx?.client.id ?? null;
  } else {
    const requested = request.nextUrl.searchParams.get("cliente");
    if (!z.uuid().safeParse(requested).success) return new Response("Falta el cliente", { status: 400 });
    const supabase = await createClient();
    const { data: canSee } = await supabase.rpc("has_scope", { p_scope: "clients" });
    if (!canSee) return new Response("Sin permiso", { status: 403 });
    clientId = requested;
  }
  if (!clientId) return new Response("No encontrado", { status: 404 });
  const pdf = await guardianConsentPdf(clientId);
  if (!pdf) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="autorizacion-tutor-train-with-jaime.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
