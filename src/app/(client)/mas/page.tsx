import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronRight, CreditCard, LogOut, MessageSquare, ShieldCheck, Trophy, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/features/auth/actions";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Más" };

export default async function MorePage() {
  const t = await getTranslations("nav.client");
  const tc = await getTranslations("common");
  const items = [
    { href: "/perfil", label: t("profile"), icon: User, ready: true },
    { href: "/perfil/plan", label: t("plan"), icon: CreditCard, ready: true },
    { href: "/agenda", label: t("agenda"), icon: CalendarDays, ready: false },
    { href: "/chat", label: t("chat"), icon: MessageSquare, ready: false },
    { href: "/retos", label: t("challenges"), icon: Trophy, ready: false },
    { href: "/perfil/privacidad", label: "Privacidad y datos", icon: ShieldCheck, ready: false },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold">{t("more")}</h1>
      <ul className="divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.href}>
            {item.ready ? (
              <Link href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <item.icon className="size-5" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground" aria-disabled>
                <item.icon className="size-5" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <Badge variant="outline">Pronto</Badge>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form action={signOut}>
        <button type="submit" className="flex items-center gap-2 px-1 text-sm font-medium text-destructive">
          <LogOut className="size-4" aria-hidden /> {tc("logout")}
        </button>
      </form>
    </div>
  );
}
