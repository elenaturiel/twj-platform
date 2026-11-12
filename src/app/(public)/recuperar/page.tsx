import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { RequestResetForm } from "@/features/auth/reset-forms";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecoverPage() {
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("resetTitle")}>
      <RequestResetForm />
    </AuthShell>
  );
}
