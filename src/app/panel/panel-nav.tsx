"use client";

import { CalendarDays, CreditCard, Home, Inbox, LineChart, Settings, Tags, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomNav, SideNav, type NavItem } from "@/components/twj/nav";

function useItems(): NavItem[] {
  const t = useTranslations("nav.panel");
  return [
    { href: "/panel", label: t("dashboard"), icon: Home, exact: true },
    { href: "/panel/clientes", label: t("clients"), icon: Users },
    { href: "/panel/pendientes", label: t("pending"), icon: Inbox },
    { href: "/panel/agenda", label: t("agenda"), icon: CalendarDays },
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
  // En móvil, las 5 más usadas
  const mobile = [items[0], items[1], items[2], items[3], items[4]].filter(Boolean) as NavItem[];
  return <BottomNav items={mobile} className="lg:hidden" />;
}
