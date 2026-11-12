"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, updatePassword } from "./actions";
import { FormMessage } from "./form-message";

export function RequestResetForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {t("resetSend")}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "…" : t("newPasswordTitle")}
      </Button>
    </form>
  );
}
