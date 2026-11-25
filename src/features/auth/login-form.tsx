"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMagicLink, signInWithPassword } from "./actions";
import { FormMessage } from "./form-message";

export function LoginForm({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const [loginState, loginAction, loginPending] = useActionState(signInWithPassword, undefined);
  const [magicState, magicAction, magicPending] = useActionState(sendMagicLink, undefined);

  return (
    <div className="space-y-5">
      <form action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link href="/recuperar" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              {t("forgot")}
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" />
        </div>
        <FormMessage state={loginState} />
        <Button type="submit" className="w-full" disabled={loginPending}>
          {loginPending ? t("loggingIn") : t("login")}
        </Button>
        <Button
          type="submit"
          variant="ghost"
          className="w-full"
          formAction={magicAction}
          formNoValidate
          disabled={magicPending}
        >
          {t("magicLink")}
        </Button>
        <FormMessage state={magicState} />
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/empezar" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("startHere")}
        </Link>
      </p>
    </div>
  );
}
