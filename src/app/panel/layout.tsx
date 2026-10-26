import Link from "next/link";
import { requireStaff } from "@/lib/auth/dal";
import { Logo } from "@/components/twj/logo";
import { ThemeToggle } from "@/components/twj/theme-toggle";
import { signOut } from "@/features/auth/actions";
import { PanelBottomNav, PanelSideNav } from "./panel-nav";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const viewer = await requireStaff();

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
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="w-full flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-10">{children}</main>
        <PanelBottomNav />
      </div>
    </div>
  );
}
