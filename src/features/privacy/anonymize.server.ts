import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_BUCKETS = ["progress-photos", "voice-notes", "documents", "chat", "student-cards"] as const;

async function removeFolder(bucket: string, prefix: string) {
  const admin = createAdminClient();
  // Recorre subcarpetas (las rutas son {client_id}/...)
  const stack = [prefix];
  while (stack.length) {
    const dir = stack.pop()!;
    const { data } = await admin.storage.from(bucket).list(dir, { limit: 1000 });
    const files: string[] = [];
    for (const item of data ?? []) {
      const path = `${dir}/${item.name}`;
      if (item.id) files.push(path);
      else stack.push(path);
    }
    if (files.length) await admin.storage.from(bucket).remove(files);
  }
}

/**
 * Anonimiza un cliente: borra sus ficheros, sus datos personales y de salud
 * (anonymize_client en la BD) y deja la cuenta sin acceso. Los pagos quedan.
 */
export async function anonymizeClient(clientId: string) {
  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("id, profile_id").eq("id", clientId).single();
  if (!client) throw new Error("Cliente no encontrado");
  for (const b of CLIENT_BUCKETS) await removeFolder(b, clientId);
  await removeFolder("avatars", client.profile_id);
  const { error } = await admin.rpc("anonymize_client", { p_client: clientId });
  if (error) throw new Error(error.message);
  // Sin acceso: email inservible y usuario bloqueado (no se borra: lo referencian pagos y mensajes)
  await admin.auth.admin.updateUserById(client.profile_id, {
    email: `eliminado+${client.profile_id}@twj.invalid`,
    user_metadata: { full_name: "Cliente eliminado" },
    ban_duration: "876000h",
  });
}

/** Cron: anonimiza a quien lleva más tiempo de baja que el plazo de conservación. */
export async function runRetentionJob() {
  const admin = createAdminClient();
  const { data } = await admin.rpc("retention_due_clients");
  let done = 0;
  const errors: string[] = [];
  for (const r of data ?? []) {
    try {
      await anonymizeClient(r.client_id);
      done++;
    } catch (e) {
      errors.push(`${r.client_id}: ${(e as Error).message}`);
    }
  }
  return { anonymized: done, errors };
}
