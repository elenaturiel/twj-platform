import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { formatEuros } from "@/lib/money";
import { EmptyState } from "@/components/twj/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MODALITY_LABELS, STATUS_LABELS, StatusBadge, formatDate } from "@/features/clients/ui";

export const metadata: Metadata = { title: "Clientes" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function ClientsPage({ searchParams }: PageProps<"/panel/clientes">) {
  await requireStaff();
  const sp = await searchParams;
  const q = one(sp.q);
  const plan = one(sp.plan);
  const estado = one(sp.estado);
  const cobro = one(sp.cobro);
  const modalidad = one(sp.modalidad);
  const etiqueta = one(sp.etiqueta);

  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("id, key, name").order("sort_order");

  let query = supabase
    .from("clients")
    .select(
      "id, status, billing_mode, modalities, tags, last_activity_at, plans!inner(key, name), profiles!inner(full_name, email), subscriptions(status, amount_cents, current_period_end, billing_interval)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (plan) query = query.eq("plans.key", plan);
  if (estado) query = query.eq("status", estado);
  if (cobro) query = query.eq("billing_mode", cobro);
  if (modalidad) query = query.contains("modalities", [modalidad]);
  if (etiqueta) query = query.contains("tags", [etiqueta]);
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`, { referencedTable: "profiles" });
  }
  const { data: clients } = await query;

  const filters = [
    { name: "plan", label: "Plan", value: plan, options: (plans ?? []).map((p) => [p.key, p.name] as const) },
    { name: "estado", label: "Estado", value: estado, options: Object.entries(STATUS_LABELS) },
    {
      name: "cobro",
      label: "Cobro",
      value: cobro,
      options: [
        ["stripe", "Stripe"],
        ["manual", "Manual"],
      ] as const,
    },
    { name: "modalidad", label: "Modalidad", value: modalidad, options: Object.entries(MODALITY_LABELS) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Clientes</h1>
        <Button asChild size="sm">
          <Link href="/panel/clientes/nuevo">
            <Plus className="size-4" aria-hidden /> Nuevo cliente
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-2" role="search">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o email"
            className="pl-8"
            aria-label="Buscar"
          />
        </div>
        {filters.map((f) => (
          <select
            key={f.name}
            name={f.name}
            defaultValue={f.value ?? ""}
            aria-label={f.label}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{f.label}: todos</option>
            {f.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ))}
        {etiqueta ? <input type="hidden" name="etiqueta" value={etiqueta} /> : null}
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/panel/clientes">Limpiar</Link>
        </Button>
      </form>

      {!clients?.length ? (
        <EmptyState title="No hay clientes con esos filtros." />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Cobro</TableHead>
                <TableHead className="hidden md:table-cell">Renovación</TableHead>
                <TableHead className="hidden lg:table-cell">Actividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const sub = c.subscriptions?.find((s) => s.status !== "cancelled") ?? c.subscriptions?.[0];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/panel/clientes/${c.id}`} className="font-medium hover:underline">
                        {c.profiles.full_name || c.profiles.email}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.modalities.map((m) => (
                          <Badge key={m} variant="outline" className="text-[10px]">
                            {MODALITY_LABELS[m] ?? m}
                          </Badge>
                        ))}
                        {c.tags.map((t) => (
                          <Link key={t} href={`/panel/clientes?etiqueta=${encodeURIComponent(t)}`}>
                            <Badge variant="secondary" className="text-[10px]">
                              #{t}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{c.plans.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {c.billing_mode === "stripe" ? "Stripe" : "Manual"}
                      {sub ? (
                        <span className="block text-xs text-muted-foreground">
                          {formatEuros(sub.amount_cents)}/{sub.billing_interval === "year" ? "año" : "mes"}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(sub?.current_period_end)}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {formatDate(c.last_activity_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{clients?.length ?? 0} clientes</p>
    </div>
  );
}
