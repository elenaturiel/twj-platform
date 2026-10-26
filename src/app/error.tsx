"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="max-w-sm">{t("generic")}</p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
