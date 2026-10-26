"use server";

import { redirect } from "next/navigation";
import { getClientContext } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/payments/stripe";
import { requestOrigin } from "@/lib/request";

/** Abre el Customer Portal de Stripe (cambiar tarjeta, facturas, cancelar). */
export async function openBillingPortal() {
  const ctx = await getClientContext();
  if (!ctx) redirect("/login");
  const stripe = getStripe();
  const admin = createAdminClient();
  const { data: client } = await admin.from("clients").select("stripe_customer_id").eq("id", ctx.client.id).single();
  if (!stripe || !client?.stripe_customer_id) redirect("/perfil/plan?portal=no");
  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripe_customer_id,
    return_url: `${await requestOrigin()}/perfil/plan`,
    locale: "es",
  });
  redirect(session.url);
}
