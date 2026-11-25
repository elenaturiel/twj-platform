"use client";

import { useTranslations } from "next-intl";
import type { AuthFormState } from "./actions";

export function FormMessage({ state }: { state: AuthFormState }) {
  const t = useTranslations();
  if (!state?.error && !state?.message) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={state.error ? "text-sm text-destructive" : "text-sm text-success"}
    >
      {t((state.error ?? state.message) as string)}
    </p>
  );
}
