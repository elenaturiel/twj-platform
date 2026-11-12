import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Descarga de mis datos (RGPD, acceso y portabilidad) en JSON. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "No se ha podido generar" }, { status: 500 });
  await supabase
    .from("data_requests")
    .insert({ profile_id: viewer.id, kind: "export", status: "done", processed_at: new Date().toISOString() });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mis-datos-twj-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
