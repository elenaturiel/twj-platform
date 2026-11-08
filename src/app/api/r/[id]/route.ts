import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Redirección de enlaces de afiliado con contador de clics (sin datos personales extra). */
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/r/[id]">) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: link } = await admin.from("affiliate_links").select("id, url, is_active").eq("id", id).maybeSingle();
  if (!link?.is_active) return NextResponse.redirect(new URL("/comida/suplementos", _request.url));

  let clientId: string | null = null;
  const viewer = await getViewer();
  if (viewer?.role === "client") {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("id").eq("profile_id", viewer.id).maybeSingle();
    clientId = data?.id ?? null;
  }
  await admin.from("affiliate_clicks").insert({ link_id: link.id, client_id: clientId });
  return NextResponse.redirect(link.url, { status: 302 });
}
