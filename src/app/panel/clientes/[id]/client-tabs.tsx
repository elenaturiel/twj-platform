"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  ["", "Resumen"],
  ["ficha", "Ficha"],
  ["entreno", "Entreno"],
  ["nutricion", "Nutrición"],
  ["progreso", "Progreso"],
  ["checkins", "Check-ins"],
  ["pagos", "Pagos"],
  ["agenda", "Agenda"],
  ["chat", "Chat"],
  ["notas", "Notas"],
  ["documentos", "Documentos"],
] as const;

export function ClientTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/panel/clientes/${clientId}`;
  return (
    <nav aria-label="Secciones del cliente" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b">
        {TABS.map(([slug, label]) => {
          const href = slug ? `${base}/${slug}` : base;
          const active = slug ? pathname.startsWith(href) : pathname === base;
          return (
            <li key={slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-block border-b-2 px-3 py-2 text-sm font-medium",
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
