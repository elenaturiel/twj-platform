import Link from "next/link";
import { Bell } from "lucide-react";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/twj/logo";
import { ThemeToggle } from "@/components/twj/theme-toggle";
import { signOut } from "@/features/auth/actions";
import { PanelBottomNav, PanelSideNav } from "./panel-nav";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", viewer.id)
    .is("read_at", null);

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground lg:flex">
        <Link href="/panel" className="px-3 pt-2">
          <Logo className="text-lg" />
        </Link>
        <PanelSideNav />
        <div className="mt-auto space-y-2 px-3 text-xs">
          <p className="truncate text-sidebar-foreground/70">{viewer.fullName || viewer.email}</p>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sidebar-foreground/70 underline-offset-4 hover:text-sidebar-foreground hover:underline"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:px-8">
          <Link href="/panel" className="lg:hidden">
            <Logo compact className="text-2xl" />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/panel/avisos"
              className="relative rounded-md p-2 hover:bg-muted"
              aria-label={`Avisos (${unread ?? 0} sin leer)`}
            >
              <Bell className="size-5" aria-hidden />
              {unread ? (
                <span className="absolute top-0.5 right-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] leading-4 font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="w-full flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-10">{children}</main>
        <PanelBottomNav />
      </div>
    </div>
  );
}
