import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="max-w-sm text-muted-foreground">{t("notFound")}</p>
      <Button asChild>
        <Link href="/">Volver</Link>
      </Button>
    </main>
  );
}
