import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { Logo } from "@/components/twj/logo";
import { ThemeToggle } from "@/components/twj/theme-toggle";
import { ClientBottomNav } from "./client-nav";

export default async function ClientLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireClientWithAccess();
  const t = await getTranslations("access");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/hoy" aria-label="Inicio">
            <Logo compact className="text-2xl" />
          </Link>
          <ThemeToggle />
        </div>
        {ctx.access.kind === "ok" && ctx.access.warning ? (
          <div className="bg-warning/15 px-4 py-2 text-center text-xs text-foreground">
            {t("pastDueBody", { date: ctx.access.warning.graceUntil })}{" "}
            <Link href="/perfil/plan" className="font-semibold underline">
              {t("pastDueTitle")}
            </Link>
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-24">{children}</main>
      <ClientBottomNav />
    </div>
  );
}
