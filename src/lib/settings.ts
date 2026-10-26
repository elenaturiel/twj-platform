import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Ajustes públicos (WhatsApp, marca…) leídos de la tabla settings. */
export const getPublicSettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value").eq("is_public", true);
  const map = new Map((data ?? []).map((s) => [s.key, s.value]));
  return {
    whatsappNumber: (map.get("contact.whatsapp_number") as string | undefined) ?? "",
    contactEmail: (map.get("contact.email") as string | undefined) ?? "",
    extraSessionPriceCents: (map.get("billing.extra_session_price_cents") as number | undefined) ?? null,
  };
});
