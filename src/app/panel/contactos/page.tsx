import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { EmptyState } from "@/components/twj/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/features/clients/ui";
import {
  CONTACT_KINDS,
  KIND_LABELS,
  OPEN_STATUSES,
  STATUS_LABELS,
  isFollowupDue,
  type ContactKind,
  type ContactStatus,
} from "@/domain/contacts/contacts";

export const metadata: Metadata = { title: "Contactos" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function ContactsPage({ searchParams }: PageProps<"/panel/contactos">) {
  await requireScope("clients");
  const sp = await searchParams;
  const q = one(sp.q);
  const tipo = one(sp.tipo);
  const estado = one(sp.estado) ?? "abiertos";
  const today = todayInMadrid();

  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id, full_name, email, phone, kind, status, company, call_at, next_followup_on, plan_interest, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (tipo && (CONTACT_KINDS as readonly string[]).includes(tipo)) query = query.eq("kind", tipo as ContactKind);
  if (estado === "abiertos") query = query.in("status", OPEN_STATUSES as ContactStatus[]);
  else if (estado === "hoy")
    query = query.in("status", OPEN_STATUSES as ContactStatus[]).lte("next_followup_on", today);
  else if (estado !== "todos" && estado in STATUS_LABELS) query = query.eq("status", estado as ContactStatus);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,company.ilike.%${term}%`);
  }
  const [{ data: contacts }, { count: dueCount }] = await Promise.all([
    query,
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .in("status", OPEN_STATUSES as ContactStatus[])
      .lte("next_followup_on", today),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Contactos</h1>
          <p className="text-sm text-muted-foreground">
            Llamadas de onboarding, asesorías gratis y colaboraciones. Si alguien se apunta, créale su ficha desde aquí.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/panel/contactos/nuevo">
            <Plus className="size-4" aria-hidden /> Nuevo contacto
          </Link>
        </Button>
      </div>

      {dueCount ? (
        <Link
          href="/panel/contactos?estado=hoy"
          className="block rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium hover:bg-accent/15"
        >
          {dueCount === 1 ? "1 contacto espera" : `${dueCount} contactos esperan`} que le escribas hoy →
        </Link>
      ) : null}

      <form className="flex flex-wrap items-end gap-2" role="search">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, email, teléfono o marca"
            className="pl-8"
            aria-label="Buscar"
          />
        </div>
        <select
          name="tipo"
          defaultValue={tipo ?? ""}
          aria-label="Tipo"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Tipo: todos</option>
          {CONTACT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          name="estado"
          defaultValue={estado}
          aria-label="Estado"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="abiertos">Abiertos</option>
          <option value="hoy">Toca escribir hoy</option>
          <option value="todos">Todos</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/panel/contactos">Limpiar</Link>
        </Button>
      </form>

      {!contacts?.length ? (
        <EmptyState
          title={q || tipo || estado !== "abiertos" ? "No hay contactos con esos filtros." : "Aún no hay contactos."}
        >
          Apunta aquí a quien te escribe o con quien tienes una llamada.
        </EmptyState>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Llamada</TableHead>
                <TableHead>Seguimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((c) => {
                const due = isFollowupDue(
                  { status: c.status as ContactStatus, next_followup_on: c.next_followup_on },
                  today,
                );
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/panel/contactos/${c.id}`} className="font-medium hover:underline">
                        {c.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {[c.company, c.phone ?? c.email].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{KIND_LABELS[c.kind as ContactKind]}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "client" ? "default" : "secondary"}>
                        {STATUS_LABELS[c.status as ContactStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.call_at ? formatDate(c.call_at, true) : "—"}</TableCell>
                    <TableCell className={due ? "text-sm font-semibold text-destructive" : "text-sm"}>
                      {c.next_followup_on ? formatDate(c.next_followup_on) : "—"}
                      {due ? " · toca" : ""}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
