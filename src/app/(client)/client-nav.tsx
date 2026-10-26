"use client";

import { CalendarCheck, Dumbbell, LineChart, Menu, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { BottomNav } from "@/components/twj/nav";

export function ClientBottomNav() {
  const t = useTranslations("nav.client");
  return (
    <BottomNav
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
