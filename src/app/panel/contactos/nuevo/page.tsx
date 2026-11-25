import type { Metadata } from "next";
import Link from "next/link";
import { requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ContactForm, EMPTY_CONTACT } from "@/features/contacts/contact-form";

export const metadata: Metadata = { title: "Nuevo contacto" };

export default async function NewContactPage() {
  await requireScope("clients");
  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("key, name").eq("is_active", true).order("sort_order");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/panel/contactos" className="text-sm text-muted-foreground hover:underline">
        ← Contactos
      </Link>
      <h1 className="text-3xl font-extrabold">Nuevo contacto</h1>
      <ContactForm initial={EMPTY_CONTACT} plans={plans ?? []} />
    </div>
  );
}
