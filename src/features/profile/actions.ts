"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type AvatarResult = { ok: true } | { ok: false; error: string };

/** Guarda la foto recién subida a avatars/{mi id}/… y borra la anterior. */
export async function saveAvatar(path: string | null): Promise<AvatarResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Inicia sesión." };
  if (path !== null && !new RegExp(`^${viewer.id}/avatar-\\d+\\.jpg$`).test(path))
    return { ok: false, error: "Archivo no válido." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", viewer.id);
  if (error) return { ok: false, error: "No se ha podido guardar la foto." };
  if (viewer.avatarPath && viewer.avatarPath !== path)
    await supabase.storage.from("avatars").remove([viewer.avatarPath]);
  revalidatePath("/", "layout");
  return { ok: true };
}
