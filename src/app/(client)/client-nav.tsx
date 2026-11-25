"use client";

import {
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Dumbbell,
  LineChart,
  Medal,
  Menu,
  MessageSquare,
  ShieldCheck,
  Trophy,
  User,
  Users,
  Utensils,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomNav, SideNav } from "@/components/twj/nav";

/** Móvil: las 4 pestañas principales y «Más». */
export function ClientBottomNav() {
  const t = useTranslations("nav.client");
  return (
    <BottomNav
      className="wide:hidden"
      items={[
        { href: "/hoy", label: t("today"), icon: CalendarCheck },
        { href: "/entreno", label: t("training"), icon: Dumbbell },
        { href: "/comida", label: t("food"), icon: Utensils },
        { href: "/progreso", label: t("progress"), icon: LineChart },
        { href: "/mas", label: t("more"), icon: Menu },
      ]}
    />
  );
}

/** Tablet y ordenador: todas las secciones en el menú lateral. */
export function ClientSideNav() {
  const t = useTranslations("nav.client");
  return (
    <SideNav
      label="Secciones"
      items={[
        { href: "/hoy", label: t("today"), icon: CalendarCheck },
        { href: "/entreno", label: t("training"), icon: Dumbbell },
        { href: "/comida", label: t("food"), icon: Utensils },
        { href: "/progreso", label: t("progress"), icon: LineChart },
        { href: "/agenda", label: t("agenda"), icon: CalendarDays },
        { href: "/chat", label: t("chat"), icon: MessageSquare },
        { href: "/retos", label: t("challenges"), icon: Trophy },
        { href: "/medallas", label: "Medallas", icon: Medal },
        { href: "/squad", label: "Squad", icon: Users },
        { href: "/perfil/plan", label: t("plan"), icon: CreditCard },
        { href: "/perfil", label: t("profile"), icon: User, exact: true },
        { href: "/perfil/privacidad", label: "Privacidad y datos", icon: ShieldCheck },
      ]}
    />
  );
}
