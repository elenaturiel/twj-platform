"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("common.theme");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("label")}>
          <Sun className="size-5 dark:hidden" aria-hidden />
          <Moon className="hidden size-5 dark:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" aria-hidden /> {t("system")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" aria-hidden /> {t("light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" aria-hidden /> {t("dark")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
