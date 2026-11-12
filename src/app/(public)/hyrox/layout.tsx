import Link from "next/link";
import { Logo } from "@/components/twj/logo";
import { ThemeToggle } from "@/components/twj/theme-toggle";

export default function HyroxLayout({ children }: LayoutProps<"/hyrox">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/empezar">
            <Logo className="text-lg" />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <Link href="/legal/privacidad">Privacidad</Link>
      </footer>
    </div>
  );
}
