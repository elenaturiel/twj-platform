"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth/dal";
import { requestOrigin } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SCOPES, type Scope } from "./scopes";

export type TeamResult = { ok: true; message?: string } | { ok: false; error: string };

async function requireOwner() {
  const viewer = await requireViewer();
  if (viewer.role !== "owner") throw new Error("Solo el titular puede gestionar el equipo");
  return viewer;
}

export async function setPermission(profileId: string, scope: Scope, enabled: boolean): Promise<TeamResult> {
  await requireOwner();
  if (!SCOPES.includes(scope)) return { ok: false, error: "Permiso no válido." };
  const supabase = await createClient();
  const { error } = enabled
    ? await supabase
        .from("staff_permissions")
        .upsert({ profile_id: profileId, scope }, { onConflict: "profile_id,scope", ignoreDuplicates: true })
    : await supabase.from("staff_permissions").delete().eq("profile_id", profileId).eq("scope", scope);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/equipo");
  return { ok: true };
}

const inviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(2).max(120),
  scopes: z.array(z.enum(SCOPES)),
});

/** Invita a alguien al equipo (rol admin) con los permisos elegidos. */
export async function inviteStaff(input: z.input<typeof inviteSchema>): Promise<TeamResult> {
  await requireOwner();
  const p = inviteSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa el nombre y el email." };
  const admin = createAdminClient();
  const email = p.data.email.toLowerCase();
  const { data: existing } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existing && existing.role === "client")
    return { ok: false, error: "Ese email es de un cliente. Usa otro para el equipo." };
  let id = existing?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: p.data.fullName },
      redirectTo: `${await requestOrigin()}/auth/callback?next=/auth/nueva-contrasena`,
    });
    if (error || !data.user) return { ok: false, error: "No se ha podido enviar la invitación." };
    id = data.user.id;
  }
  await admin.from("profiles").update({ role: "admin", full_name: p.data.fullName, deleted_at: null }).eq("id", id);
  if (p.data.scopes.length)
    await admin.from("staff_permissions").upsert(
      p.data.scopes.map((scope) => ({ profile_id: id!, scope })),
      { onConflict: "profile_id,scope", ignoreDuplicates: true },
    );
  revalidatePath("/panel/equipo");
  return { ok: true, message: existing ? "Permisos actualizados." : "Invitación enviada por email." };
}

/** Quita el acceso a alguien del equipo (no se borra: queda su rastro en el historial). */
export async function deactivateStaff(profileId: string): Promise<TeamResult> {
  const owner = await requireOwner();
  if (profileId === owner.id) return { ok: false, error: "No puedes quitarte el acceso a ti mismo." };
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role").eq("id", profileId).single();
  if (target?.role !== "admin") return { ok: false, error: "Solo se puede desactivar a administradores." };
  await admin.from("staff_permissions").delete().eq("profile_id", profileId);
  await admin.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", profileId);
  await admin.auth.admin.updateUserById(profileId, { ban_duration: "876000h" });
  revalidatePath("/panel/equipo");
  return { ok: true, message: "Acceso retirado." };
}
