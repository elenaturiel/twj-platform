"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";
import { emailSchema, loginSchema, passwordSchema } from "./schemas";

export type AuthFormState = { ok?: boolean; error?: string; message?: string } | undefined;

async function siteUrl() {
  // En previews de Vercel el origen real es el de la petición
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : publicEnv.NEXT_PUBLIC_SITE_URL;
}

export async function signInWithPassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "errors.invalidForm" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: "auth.invalidCredentials" };

  redirect(safeNextPath(parsed.data.next, "/"));
}

export async function sendMagicLink(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "auth.emailInvalid" };
  const next = safeNextPath(formData.get("next")?.toString(), "/");

  const supabase = await createClient();
  // shouldCreateUser: false → las cuentas se crean en /empezar o por invitación, no desde el login
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  // Misma respuesta exista o no el email (no revelamos quién es cliente)
  return { ok: true, message: "auth.magicLinkSent" };
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next")?.toString(), "/");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function requestPasswordReset(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "auth.emailInvalid" };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/nueva-contrasena`,
  });
  return { ok: true, message: "auth.resetSent" };
}

export async function updatePassword(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { error: "auth.passwordMin" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "errors.generic" };
  redirect("/?password=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
