import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/twj/logo";

// Pantalla de carga con el lema
export default async function Loading() {
  const t = await getTranslations("brand");
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8" role="status" aria-live="polite">
      <Logo className="text-3xl" />
      <p className="animate-pulse text-sm text-muted-foreground">{t("tagline")}</p>
    </div>
  );
}
