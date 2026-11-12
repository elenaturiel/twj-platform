import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { FIELD_LABELS, formatFieldValue } from "./labels";

/**
 * Agrupa los cambios pendientes de aviso de un cliente en UNA notificación a staff
 * (in-app + email/push según preferencias; con "resumen diario" van al digest).
 */
export async function notifyProfileChanges(clientId: string) {
  const admin = createAdminClient();
  const { data: changes } = await admin
    .from("profile_changes")
    .select("id, field, old_value, new_value")
    .eq("client_id", clientId)
    .is("notified_at", null)
    .order("created_at");
  if (!changes?.length) return;

  const { data: client } = await admin.from("clients").select("profiles(full_name)").eq("id", clientId).single();
  const name = client?.profiles?.full_name ?? "Un cliente";
  const lines = changes.map(
    (c) =>
      `${FIELD_LABELS[c.field] ?? c.field}: ${formatFieldValue(c.field, c.old_value)} → ${formatFieldValue(c.field, c.new_value)}`,
  );

  await admin.rpc("notify_staff", {
    p_type: "client_profile_changed",
    p_title: `${name} ha cambiado su ficha`,
    p_body: lines.join("\n"),
    p_link: `/panel/clientes/${clientId}/ficha`,
    p_client_id: clientId,
    p_data: { change_ids: changes.map((c) => c.id) },
  });
  await admin
    .from("profile_changes")
    .update({ notified_at: new Date().toISOString() })
    .in(
      "id",
      changes.map((c) => c.id),
    );
}
