import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/features/auth/auth-shell";
import { NewPasswordForm } from "@/features/auth/reset-forms";
import { requireViewer } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function NewPasswordPage() {
  await requireViewer();
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("newPasswordTitle")}>
      <NewPasswordForm />
    </AuthShell>
  );
}
