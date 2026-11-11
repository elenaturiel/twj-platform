import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { getViewer, homePathFor } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/safe-redirect";
import { googleLoginEnabled } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(safeNextPath(typeof next === "string" ? next : null, homePathFor(viewer.role)));

  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("loginTitle")} subtitle={t("loginSubtitle")}>
      {error === "link" ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Ese enlace de acceso ha caducado o ya se ha usado. Pide a Jaime uno nuevo, o entra con tu contraseña si ya la
          elegiste.
        </p>
      ) : null}
      <LoginForm next={typeof next === "string" ? next : undefined} google={await googleLoginEnabled()} />
    </AuthShell>
  );
}
