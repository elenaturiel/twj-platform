import Link from "next/link";
import { Bell, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { Logo } from "@/components/twj/logo";
import { ThemeToggle } from "@/components/twj/theme-toggle";
import { UserMenu } from "@/components/twj/user-menu";
import { formatDate } from "@/features/clients/ui";
import { OutboxSync } from "@/features/training/ui/outbox-sync";
import { ClientBottomNav, ClientSideNav } from "./client-nav";

export default async function ClientLayout({ children }: LayoutProps<"/">) {
  const ctx = await requireClientWithAccess();
  const t = await getTranslations("access");
  const supabase = await createClient();
  const [{ count: unread }, { data: chatUnread }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", ctx.viewer.id)
      .is("read_at", null)
      .neq("type", "chat_message"),
    supabase.rpc("chat_unread_count"),
  ]);
  const badge = (n: number) =>
    n ? (
      <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-bold text-white">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-52 shrink-0 flex-col gap-6 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground lg:w-60 wide:flex">
        <Link href="/hoy" className="px-3 pt-2" aria-label="Inicio">
          <Logo className="text-lg" />
        </Link>
        <ClientSideNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 lg:px-8 wide:px-6">
            <Link href="/hoy" aria-label="Inicio" className="wide:hidden">
              <Logo compact className="text-2xl" />
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/chat"
                className="relative rounded-md p-2 hover:bg-muted"
                aria-label={`Chat (${chatUnread ?? 0} sin leer)`}
              >
                <MessageSquare className="size-5" aria-hidden />
                {badge(chatUnread ?? 0)}
              </Link>
              <Link
                href="/avisos"
                className="relative rounded-md p-2 hover:bg-muted"
                aria-label={`Avisos (${unread ?? 0} sin leer)`}
              >
                <Bell className="size-5" aria-hidden />
                {badge(unread ?? 0)}
              </Link>
              <ThemeToggle />
              <UserMenu
                name={ctx.viewer.fullName}
                email={ctx.viewer.email}
                links={[
                  { href: "/perfil", label: "Mi ficha" },
                  { href: "/perfil/plan", label: "Mi plan y pagos" },
                  { href: "/perfil/notificaciones", label: "Avisos" },
                ]}
              />
            </div>
          </div>
          {ctx.access.kind === "ok" && ctx.access.warning ? (
            <div className="bg-warning/15 px-4 py-2 text-center text-xs text-foreground">
              {t("pastDueBody", { date: formatDate(ctx.access.warning.graceUntil) })}{" "}
              <Link href="/perfil/plan" className="font-semibold underline">
                {t("pastDueTitle")}
              </Link>
            </div>
          ) : null}
        </header>
        <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-24 lg:px-8 wide:max-w-5xl wide:px-6 wide:pt-6 wide:pb-10">
          {children}
        </main>
        <ClientBottomNav />
      </div>
      <OutboxSync />
    </div>
  );
}
