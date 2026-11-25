import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { BILLING_MODE_LABELS, MODALITY_LABELS, StatusBadge } from "@/features/clients/ui";
import { ClientTabs } from "./client-tabs";
import { AccessLinkButton } from "@/features/clients/access-link";

export default async function ClientLayout({ children, params }: LayoutProps<"/panel/clientes/[id]">) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select("id, status, billing_mode, modalities, is_minor, guardian_status, plans(name), profiles(full_name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link href="/panel/clientes" className="text-sm text-muted-foreground hover:underline">
        ← Clientes
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-3xl font-extrabold">{c.profiles?.full_name || c.profiles?.email}</h1>
        <Badge>{c.plans?.name}</Badge>
        <StatusBadge status={c.status} />
        <Badge variant="outline">{BILLING_MODE_LABELS[c.billing_mode] ?? c.billing_mode}</Badge>
        {c.modalities.map((m) => (
          <Badge key={m} variant="outline">
            {MODALITY_LABELS[m] ?? m}
          </Badge>
        ))}
        <span className="ml-auto">
          <AccessLinkButton clientId={c.id} name={c.profiles?.full_name || c.profiles?.email || "el cliente"} />
        </span>
        {c.is_minor ? (
          <Badge variant="destructive">Menor · tutor {c.guardian_status === "confirmed" ? "OK" : "pendiente"}</Badge>
        ) : null}
      </div>
      <ClientTabs clientId={c.id} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
