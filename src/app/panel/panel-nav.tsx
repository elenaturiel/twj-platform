"use client";

import {
  Activity,
  BookOpen,
  Contact,
  CalendarDays,
  CreditCard,
  Home,
  Inbox,
  LineChart,
  Settings,
  Tags,
  Users,
  MessageSquare,
  Trophy,
  Flag,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { BottomNav, SideNav, type NavItem } from "@/components/twj/nav";

function useItems(): NavItem[] {
  const t = useTranslations("nav.panel");
  return [
    { href: "/panel", label: t("dashboard"), icon: Home, exact: true },
    { href: "/panel/clientes", label: t("clients"), icon: Users },
    { href: "/panel/contactos", label: t("contacts"), icon: Contact },
    { href: "/panel/pendientes", label: t("pending"), icon: Inbox },
    { href: "/panel/chat", label: t("chat"), icon: MessageSquare },
    { href: "/panel/agenda", label: t("agenda"), icon: CalendarDays },
    { href: "/panel/biblioteca", label: t("library"), icon: BookOpen },
    { href: "/panel/seguimiento", label: t("tracking"), icon: Activity },
    { href: "/panel/retos", label: t("challenges"), icon: Trophy },
    { href: "/panel/hyrox", label: t("hyrox"), icon: Flag },
    { href: "/panel/pagos", label: t("payments"), icon: CreditCard },
    { href: "/panel/negocio", label: t("business"), icon: LineChart },
    { href: "/panel/planes", label: t("plans"), icon: Tags },
    { href: "/panel/ajustes", label: t("settings"), icon: Settings },
  ];
}

export function PanelSideNav() {
  return <SideNav items={useItems()} />;
}

export function PanelBottomNav() {
  const items = useItems();
  // En el móvil, las 4 más usadas y «Más» con todas las demás (Mensajes ya está en la cabecera)
  const pick = ["/panel", "/panel/clientes", "/panel/pendientes", "/panel/agenda"];
  const mobile: NavItem[] = [
    ...pick.map((href) => items.find((i) => i.href === href)).filter((i): i is NavItem => Boolean(i)),
    { href: "/panel/mas", label: "Más", icon: Menu },
  ];
  return <BottomNav items={mobile} className="wide:hidden" />;
}

/** Todas las secciones del panel, para «Más» en el móvil. */
export function PanelMoreList() {
  const items = useItems().filter((i) => i.href !== "/panel");
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
            <item.icon className="size-5 text-muted-foreground" aria-hidden />
            <span className="flex-1">{item.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
