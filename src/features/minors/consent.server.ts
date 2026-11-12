import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { buildGuardianConsentBlocks, type ConsentPdfData } from "@/domain/minors/consent";
import { renderGuardianConsentPdf } from "./consent-pdf.server";

/** Datos para el PDF (con los permisos de quien lo pide: el propio menor o el equipo). */
export async function guardianConsentPdf(clientId: string): Promise<Uint8Array | null> {
  const supabase = await createClient();
  const [{ data: client }, { data: guardian }, { data: legal }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, profiles(full_name, email, phone), plans(name), client_intake(birth_date)")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("guardian_authorizations")
      .select("guardian_name, guardian_email")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("legal_documents")
      .select("body_md, version")
      .eq("kind", "guardian")
      .eq("is_draft", false)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!client?.profiles) return null;
  const intake = Array.isArray(client.client_intake) ? client.client_intake[0] : client.client_intake;
  const data: ConsentPdfData = {
    minor: {
      name: client.profiles.full_name,
      birthDate: intake?.birth_date ?? null,
      email: client.profiles.email,
      phone: client.profiles.phone,
    },
    guardian: { name: guardian?.guardian_name ?? null, email: guardian?.guardian_email ?? null },
    planName: client.plans?.name ?? null,
    legal: legal?.body_md ? { body: legal.body_md, version: String(legal.version) } : null,
    today: todayInMadrid(),
    reference: client.id.slice(0, 8).toUpperCase(),
  };
  return renderGuardianConsentPdf(buildGuardianConsentBlocks(data));
}
