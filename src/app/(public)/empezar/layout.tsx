import Link from "next/link";
import { Logo } from "@/components/twj/logo";
import { ThemeToggle } from "@/components/twj/theme-toggle";

export default function StartLayout({ children }: LayoutProps<"/empezar">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/empezar">
            <Logo className="text-lg" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium underline-offset-4 hover:underline">
              Ya soy cliente
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <nav className="flex flex-wrap justify-center gap-4">
          <Link href="/legal/aviso-legal">Aviso legal</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
          <Link href="/legal/terminos">Términos</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </nav>
      </footer>
    </div>
  );
}
