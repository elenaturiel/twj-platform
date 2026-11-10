"use client";

import { useTransition } from "react";
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Menú de la cuenta (arriba a la derecha): siempre a mano para cambiar la contraseña y cerrar sesión. */
export function UserMenu({
  name,
  email,
  links = [],
}: {
  name: string;
  email: string;
  links?: { href: string; label: string }[];
}) {
  const [pending, start] = useTransition();
  const initial = (name.trim()[0] ?? email[0] ?? "?").toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Tu cuenta"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate font-semibold">{name || "Tu cuenta"}</span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        {links.length ? <DropdownMenuSeparator /> : null}
        {links.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}>{l.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/auth/nueva-contrasena">
            <KeyRound className="size-4" aria-hidden /> Cambiar contraseña
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            start(async () => {
              await signOut();
            });
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" aria-hidden /> {pending ? "Cerrando sesión…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
