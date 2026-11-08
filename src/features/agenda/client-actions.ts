"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClientContext } from "@/lib/auth/dal";
import { getStripe, paymentsMode } from "@/lib/payments/stripe";
import { requestOrigin } from "@/lib/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureStripeCustomer } from "@/features/billing/stripe-sync";
import { fulfillExtraSession } from "./extra.server";
import { getSlotsForDay } from "./queries";
import { afterBooking, afterCancel, afterReschedule, bookingError } from "./sync.server";

export type AgendaResult = { ok: true; message?: string } | { ok: false; error: string };

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function loadSlots(typeKey: string, date: string): Promise<string[]> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok" || !DATE.safeParse(date).success) return [];
  return getSlotsForDay(typeKey, date);
}

const bookSchema = z.object({
  typeKey: z.string().min(2).max(40),
  startsAt: z.iso.datetime(),
  notes: z.string().max(1000).optional(),
});

export async function bookMyAppointment(input: z.infer<typeof bookSchema>): Promise<AgendaResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { ok: false, error: "Sin acceso." };
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  // Revalida contra el calendario de Jaime (la BD no ve su Google)
  const date = new Date(parsed.data.startsAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const free = await getSlotsForDay(parsed.data.typeKey, date);
  if (!free.includes(new Date(parsed.data.startsAt).toISOString()))
    return { ok: false, error: "Ese hueco ya no está disponible." };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("book_appointment", {
    p_type: parsed.data.typeKey,
    p_starts_at: parsed.data.startsAt,
    p_notes: parsed.data.notes ?? undefined,
  });
  if (error || !id) return { ok: false, error: bookingError(error?.message) };
  await afterBooking(id as string, "client");
  revalidatePath("/agenda", "layout");
  revalidatePath("/hoy");
  return { ok: true };
}

export async function cancelMyAppointment(id: string, reason?: string): Promise<AgendaResult> {
  const ctx = await getClientContext();
  if (!ctx) return { ok: false, error: "Sin acceso." };
  const supabase = await createClient();
  const { data: refunded, error } = await supabase.rpc("cancel_appointment", {
    p_id: id,
    p_reason: reason?.slice(0, 500) ?? undefined,
  });
  if (error) return { ok: false, error: bookingError(error.message) };
  await afterCancel(id, "client", Boolean(refunded));
  revalidatePath("/agenda", "layout");
  revalidatePath("/hoy");
  return {
    ok: true,
    message: refunded
      ? "Cancelada. Te hemos devuelto el crédito."
      : "Cancelada (fuera de plazo: el crédito no se devuelve).",
  };
}

export async function rescheduleMyAppointment(id: string, startsAt: string): Promise<AgendaResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { ok: false, error: "Sin acceso." };
  if (!z.iso.datetime().safeParse(startsAt).success) return { ok: false, error: "Hora no válida." };
  const supabase = await createClient();
  const { data: appt } = await supabase.from("appointments").select("type_key").eq("id", id).maybeSingle();
  if (!appt) return { ok: false, error: "Cita no encontrada." };
  const date = new Date(startsAt).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const free = await getSlotsForDay(appt.type_key, date);
  if (!free.includes(new Date(startsAt).toISOString())) return { ok: false, error: "Ese hueco ya no está disponible." };
  const { error } = await supabase.rpc("reschedule_appointment", { p_id: id, p_starts_at: startsAt });
  if (error) return { ok: false, error: bookingError(error.message) };
  await afterReschedule(id, "client");
  revalidatePath("/agenda", "layout");
  revalidatePath("/hoy");
  return { ok: true };
}

/** Compra de una sesión extra de 1 h: Checkout de Stripe (pago único) o simulador en local. */
export async function buyExtraSession(): Promise<{ url: string } | { error: string }> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { error: "Sin acceso." };
  const supabase = await createClient();
  const [{ data: allowed }, { data: price }] = await Promise.all([
    supabase.rpc("has_feature", { p_client_id: ctx.client.id, p_feature: "extra_sessions" }),
    supabase.from("settings").select("value").eq("key", "billing.extra_session_price_cents").maybeSingle(),
  ]);
  if (!allowed) return { error: "Las sesiones extra van en los planes MVP y Peak." };
  const amount = typeof price?.value === "number" ? price.value : null;
  if (!amount) return { error: "Precio de la sesión extra sin configurar." };

  let mode: ReturnType<typeof paymentsMode>;
  try {
    mode = paymentsMode();
  } catch {
    return { error: "Los pagos online aún no están activos: díselo a Jaime y te la apunta a mano." };
  }
  const origin = await requestOrigin();
  if (mode === "mock") {
    await fulfillExtraSession({ clientId: ctx.client.id, amountCents: amount, reference: `mock_${randomUUID()}` });
    revalidatePath("/agenda", "layout");
    return { url: "/agenda?extra=ok" };
  }
  const stripe = getStripe()!;
  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, stripe_customer_id")
    .eq("id", ctx.client.id)
    .single();
  const customer = await ensureStripeCustomer(stripe, admin, client!, {
    email: ctx.viewer.email,
    full_name: ctx.viewer.fullName,
  });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: { name: "Sesión extra 1 h · Train with Jaime" },
        },
      },
    ],
    metadata: { kind: "extra_session", client_id: ctx.client.id },
    payment_intent_data: { metadata: { kind: "extra_session", client_id: ctx.client.id } },
    locale: "es",
    success_url: `${origin}/agenda?extra=ok`,
    cancel_url: `${origin}/agenda`,
  });
  return session.url ? { url: session.url } : { error: "No se ha podido iniciar el pago." };
}
