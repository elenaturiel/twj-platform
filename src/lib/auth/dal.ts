import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  resolveClientAccess,
  type ClientAccess,
  type ClientStatus,
  type GuardianStatus,
} from "@/domain/access/client-access";
import { todayInMadrid } from "@/lib/dates";

export type Role = "owner" | "admin" | "client";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  theme: "system" | "light" | "dark";
};

/**
 * Capa de acceso a datos (DAL): única forma de saber quién es el usuario.
 * Memoizada por petición con React cache.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, theme, deleted_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.deleted_at) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
    theme: profile.theme as Viewer["theme"],
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireStaff(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role === "client") redirect("/hoy");
  return viewer;
}

export type ClientContext = {
  viewer: Viewer;
  client: {
    id: string;
    status: string;
    planId: string | null;
    planKey: string | null;
    planName: string | null;
    isMinor: boolean;
    guardianStatus: string;
    onboardingCompletedAt: string | null;
  };
  access: ClientAccess;
};

export const getClientContext = cache(async (): Promise<ClientContext | null> => {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "client") return null;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, status, plan_id, is_minor, guardian_status, onboarding_completed_at, plans(key, name)")
    .eq("profile_id", viewer.id)
    .maybeSingle();
  if (!client) return null;

  let graceUntil: string | null = null;
  if (client.status === "past_due") {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("grace_until")
      .eq("client_id", client.id)
      .eq("status", "past_due")
      .maybeSingle();
    graceUntil = sub?.grace_until ?? null;
  }

  const access = resolveClientAccess({
    status: client.status as ClientStatus,
    graceUntil,
    onboardingCompleted: Boolean(client.onboarding_completed_at),
    guardianStatus: client.guardian_status as GuardianStatus,
    today: todayInMadrid(),
  });

  return {
    viewer,
    client: {
      id: client.id,
      status: client.status,
      planId: client.plan_id,
      planKey: client.plans?.key ?? null,
      planName: client.plans?.name ?? null,
      isMinor: client.is_minor,
      guardianStatus: client.guardian_status,
      onboardingCompletedAt: client.onboarding_completed_at,
    },
    access,
  };
});

/** Para las páginas de la app del cliente: si no puede entrar, lo manda a donde toca. */
export async function requireClientWithAccess(): Promise<ClientContext> {
  const viewer = await requireViewer();
  if (viewer.role !== "client") redirect("/panel");
  const ctx = await getClientContext();
  if (!ctx) redirect("/estado");
  switch (ctx.access.kind) {
    case "ok":
      return ctx;
    case "needs_onboarding":
      redirect("/onboarding");
    default:
      redirect("/estado");
  }
}

export function homePathFor(role: Role) {
  return role === "client" ? "/hoy" : "/panel";
}
