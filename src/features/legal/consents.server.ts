import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestMeta } from "@/lib/request";

export type ConsentKind =
  "terms" | "privacy" | "health_data" | "progress_photos" | "marketing" | "cookies" | "guardian";

export async function currentLegalVersions(): Promise<Record<string, string>> {
  const admin = createAdminClient();
  const { data } = await admin.from("settings").select("value").eq("key", "legal.current_versions").maybeSingle();
  return (data?.value as Record<string, string>) ?? {};
}

/** Guarda consentimientos (append-only) con versión, IP y user agent. */
export async function recordConsents(profileId: string, consents: Partial<Record<ConsentKind, boolean>>) {
  const admin = createAdminClient();
  const versions = await currentLegalVersions();
  const { ip, userAgent } = await requestMeta();
  const rows = Object.entries(consents).map(([kind, granted]) => ({
    profile_id: profileId,
    kind,
    granted: Boolean(granted),
    document_version: versions[kind] ?? "sin-version",
    ip,
    user_agent: userAgent,
  }));
  if (rows.length) {
    const { error } = await admin.from("consents").insert(rows);
    if (error) throw new Error(error.message);
  }
}
