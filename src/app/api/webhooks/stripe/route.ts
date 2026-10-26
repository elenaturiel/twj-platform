import type Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { getStripe } from "@/lib/payments/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { applySubscriptionPayment, cancelSubscription, markPastDue } from "@/features/billing/fulfillment";
import { attachRecurringDiscounts } from "@/features/billing/stripe-sync";
import type { QuoteLine } from "@/domain/billing/types";

export const runtime = "nodejs";

function siteUrl(request: NextRequest) {
  return request.nextUrl.origin;
}

/** Busca nuestra suscripción a partir de la de Stripe (metadata o id guardado). */
async function findSubscriptionId(stripeSubId: string | null | undefined, metadataId?: string | null) {
  if (metadataId) return metadataId;
  if (!stripeSubId) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();
  return data?.id ?? null;
}

function invoiceSubscription(invoice: Stripe.Invoice) {
  const details = invoice.parent?.subscription_details;
  const sub = details?.subscription;
  return {
    stripeSubscriptionId: typeof sub === "string" ? sub : (sub?.id ?? null),
    metadataId: details?.metadata?.subscription_id ?? null,
  };
}

function toDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

async function handle(event: Stripe.Event, request: NextRequest) {
  const stripe = getStripe()!;
  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (
        session.mode === "subscription" &&
        session.metadata?.subscription_id &&
        typeof session.subscription === "string"
      ) {
        await admin
          .from("subscriptions")
          .update({ stripe_subscription_id: session.subscription })
          .eq("id", session.metadata.subscription_id);
      }
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const { stripeSubscriptionId, metadataId } = invoiceSubscription(invoice);
      const subscriptionId = await findSubscriptionId(stripeSubscriptionId, metadataId);
      if (!subscriptionId) return;
      const line = invoice.lines.data[0];
      const result = await applySubscriptionPayment(
        {
          subscriptionId,
          method: "stripe",
          amountCents: invoice.amount_paid,
          discountCents: Math.max(invoice.subtotal - invoice.total, 0),
          paidAt: new Date((invoice.status_transitions.paid_at ?? event.created) * 1000).toISOString(),
          periodStart: line ? toDate(line.period.start) : undefined,
          periodEnd: line ? toDate(line.period.end) : undefined,
          stripe: { invoiceId: invoice.id, subscriptionId: stripeSubscriptionId },
        },
        siteUrl(request),
      );
      // Primer cobro: el cupón de Checkout era de un solo uso; ahora cada descuento
      // recurrente pasa a la suscripción con su propia duración.
      if ("isFirst" in result && result.isFirst && stripeSubscriptionId) {
        const { data: sub } = await admin
          .from("subscriptions")
          .select("discount_breakdown")
          .eq("id", subscriptionId)
          .single();
        const lines = await recurringLinesFor(subscriptionId, sub?.discount_breakdown);
        await attachRecurringDiscounts(stripe, stripeSubscriptionId, subscriptionId, lines);
      }
      return;
    }

    case "invoice.payment_failed": {
      const { stripeSubscriptionId, metadataId } = invoiceSubscription(event.data.object);
      const subscriptionId = await findSubscriptionId(stripeSubscriptionId, metadataId);
      if (subscriptionId) await markPastDue(subscriptionId, siteUrl(request), "failed");
      return;
    }

    case "customer.subscription.updated": {
      const s = event.data.object;
      const subscriptionId = await findSubscriptionId(s.id, s.metadata?.subscription_id);
      if (!subscriptionId) return;
      await admin
        .from("subscriptions")
        .update({ cancel_at_period_end: s.cancel_at_period_end, stripe_subscription_id: s.id })
        .eq("id", subscriptionId);
      if (s.status === "paused") {
        await admin.from("subscriptions").update({ status: "paused" }).eq("id", subscriptionId);
      }
      return;
    }

    case "customer.subscription.deleted": {
      const s = event.data.object;
      const subscriptionId = await findSubscriptionId(s.id, s.metadata?.subscription_id);
      if (subscriptionId) await cancelSubscription(subscriptionId);
      return;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.metadata?.subscription_id) {
        await admin
          .from("discount_redemptions")
          .update({ status: "expired" })
          .eq("subscription_id", session.metadata.subscription_id)
          .eq("status", "reserved");
      }
      return;
    }
  }
}

/** Reconstruye las líneas de descuento (con duración) a partir de lo guardado en la suscripción. */
async function recurringLinesFor(subscriptionId: string, breakdown: unknown): Promise<QuoteLine[]> {
  const admin = createAdminClient();
  const { data: redemptions } = await admin
    .from("discount_redemptions")
    .select("discount_id, discounts(kind, name, duration, duration_months)")
    .eq("subscription_id", subscriptionId)
    .eq("status", "applied");
  const items = (breakdown as { kind: string; label: string; amount_cents: number; percent: number | null }[]) ?? [];
  return items.flatMap((b) => {
    const r = redemptions?.find((x) => x.discounts?.kind === b.kind);
    if (!r?.discounts) return [];
    return [
      {
        discountId: r.discount_id,
        kind: r.discounts.kind as QuoteLine["kind"],
        label: b.label,
        amountCents: b.amount_cents,
        percent: b.percent ?? undefined,
        duration: r.discounts.duration as QuoteLine["duration"],
        durationMonths: r.discounts.duration_months,
      },
    ];
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = serverEnv().STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Falta la firma" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  // Idempotencia: cada evento se procesa una sola vez
  const admin = createAdminClient();
  const { error: dupError } = await admin
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, payload: event as unknown as never });
  if (dupError?.code === "23505") {
    const { data: prev } = await admin.from("stripe_events").select("processed_at").eq("id", event.id).single();
    if (prev?.processed_at) return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handle(event, request);
    await admin
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin.from("stripe_events").update({ error: message }).eq("id", event.id);
    // 500 → Stripe reintenta más tarde
    return NextResponse.json({ error: "Error procesando el evento" }, { status: 500 });
  }
}
