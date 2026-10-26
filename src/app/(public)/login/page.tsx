import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { getViewer, homePathFor } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(safeNextPath(typeof next === "string" ? next : null, homePathFor(viewer.role)));

  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      <LoginForm next={typeof next === "string" ? next : undefined} />
    </AuthShell>
  );
}
