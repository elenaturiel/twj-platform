import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ContactForm, type ContactValues } from "@/features/contacts/contact-form";
import { ContactComments } from "@/features/contacts/contact-comments";
import { KIND_LABELS, newClientHref, type ContactKind } from "@/domain/contacts/contacts";

export const metadata: Metadata = { title: "Contacto" };

export default async function ContactPage({ params }: PageProps<"/panel/contactos/[id]">) {
  const viewer = await requireScope("clients");
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: contact }, { data: comments }, { data: plans }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contact_comments")
      .select("id, body, created_at, author_id, profiles(full_name)")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("key, name").eq("is_active", true).order("sort_order"),
  ]);
  if (!contact) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/panel/contactos" className="text-sm text-muted-foreground hover:underline">
        ← Contactos
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{contact.full_name}</h1>
          <p className="text-sm text-muted-foreground">{KIND_LABELS[contact.kind as ContactKind]}</p>
        </div>
        {contact.client_id ? (
          <Button asChild variant="outline">
            <Link href={`/panel/clientes/${contact.client_id}`}>Ya es cliente · ver su ficha</Link>
          </Button>
        ) : contact.kind !== "collaboration" ? (
          <div className="space-y-1 text-right">
            <Button asChild>
              <Link href={newClientHref(contact)}>
                <UserPlus className="size-4" aria-hidden /> Crear ficha de cliente
              </Link>
            </Button>
            {!contact.email ? (
              <p className="text-xs text-muted-foreground">Te pedirá su email para mandarle el acceso.</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ContactForm initial={contact as ContactValues} plans={plans ?? []} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ContactComments
            contactId={contact.id}
            comments={(comments ?? []).map((c) => ({
              id: c.id,
              body: c.body,
              created_at: c.created_at,
              author: c.profiles?.full_name ?? null,
              mine: c.author_id === viewer.id,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
