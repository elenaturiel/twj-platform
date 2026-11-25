import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Enlace temporal (1 h) a la foto de perfil, que vive en un bucket privado. */
export async function avatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
