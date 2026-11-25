import type { Metadata } from "next";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { NewClientForm } from "@/features/clients/new-client-form";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NewClientPage({ searchParams }: PageProps<"/panel/clientes/nuevo">) {
  await requireScope("clients");
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("key, name, price_cents, annual_allowed")
    .eq("is_active", true)
    .order("sort_order");
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="text-3xl font-extrabold">Nuevo cliente</h1>
      {str(sp.contacto) ? (
        <p className="max-w-xl rounded-lg border bg-muted/40 p-3 text-sm">
          Viene de Contactos: lo que apuntaste en la llamada (objetivo, nivel, lesiones, días, alergias…) pasa a su
          ficha, y tus notas quedan en Notas.
        </p>
      ) : null}
      <NewClientForm
        defaults={{
          name: str(sp.nombre),
          email: str(sp.email),
          phone: str(sp.telefono),
          planKey: str(sp.plan),
          leadId: str(sp.solicitud),
          contactId: str(sp.contacto),
        }}
        plans={(plans ?? []).map((p) => ({
          key: p.key,
          name: p.name,
          priceCents: p.price_cents,
          annualAllowed: p.annual_allowed,
        }))}
      />
    </div>
  );
}
