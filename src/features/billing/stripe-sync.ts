import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingInterval, QuoteLine } from "@/domain/billing/types";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

/** Producto de Stripe del plan (se crea la primera vez). */
export async function ensureStripeProduct(
  stripe: Stripe,
  admin: Admin,
  plan: { id: string; key: string; name: string; stripe_product_id: string | null },
) {
  if (plan.stripe_product_id) return plan.stripe_product_id;
  const product = await stripe.products.create(
    { name: `TWJ ${plan.name}`, metadata: { plan_key: plan.key, plan_id: plan.id } },
    { idempotencyKey: `product-${plan.id}` },
  );
  await admin.from("plans").update({ stripe_product_id: product.id }).eq("id", plan.id);
  return product.id;
}

/**
 * Price de Stripe vigente del plan para el intervalo (precio de LISTA, IVA incluido).
 * Si el precio del plan cambia, se crea un Price nuevo y el anterior queda para
 * los clientes que ya lo tenían (grandfathering).
 */
export async function ensureStripePrice(
  stripe: Stripe,
  admin: Admin,
  plan: { id: string; key: string; name: string; stripe_product_id: string | null },
  interval: BillingInterval,
  amountCents: number,
) {
  const { data: current } = await admin
    .from("plan_prices")
    .select("id, amount_cents, stripe_price_id")
    .eq("plan_id", plan.id)
    .eq("interval", interval)
    .is("valid_to", null)
    .maybeSingle();
  if (current?.stripe_price_id && current.amount_cents === amountCents) return current.stripe_price_id;

  const productId = await ensureStripeProduct(stripe, admin, plan);
  const price = await stripe.prices.create(
    {
      product: productId,
      currency: "eur",
      unit_amount: amountCents,
      tax_behavior: "inclusive",
      recurring: { interval },
      metadata: { plan_key: plan.key, interval },
    },
    { idempotencyKey: `price-${plan.id}-${interval}-${amountCents}` },
  );

  if (current && current.amount_cents === amountCents) {
    await admin.from("plan_prices").update({ stripe_price_id: price.id }).eq("id", current.id);
  } else {
    if (current) await admin.from("plan_prices").update({ valid_to: new Date().toISOString() }).eq("id", current.id);
    await admin
      .from("plan_prices")
      .insert({ plan_id: plan.id, interval, amount_cents: amountCents, stripe_price_id: price.id });
  }
  return price.id;
}

export async function ensureStripeCustomer(
  stripe: Stripe,
  admin: Admin,
  client: { id: string; stripe_customer_id: string | null },
  profile: { email: string; full_name: string },
) {
  if (client.stripe_customer_id) return client.stripe_customer_id;
  const customer = await stripe.customers.create(
    {
      email: profile.email,
      name: profile.full_name || undefined,
      metadata: { client_id: client.id },
      preferred_locales: ["es"],
    },
    { idempotencyKey: `customer-${client.id}` },
  );
  await admin.from("clients").update({ stripe_customer_id: customer.id }).eq("id", client.id);
  return customer.id;
}

/** Cupón de un solo uso para el primer cobro: descuenta exactamente lo que calculó nuestro motor. */
export async function createFirstPeriodCoupon(
  stripe: Stripe,
  subscriptionId: string,
  discountCents: number,
  label: string,
) {
  if (discountCents <= 0) return null;
  const coupon = await stripe.coupons.create(
    {
      amount_off: discountCents,
      currency: "eur",
      duration: "once",
      name: label.slice(0, 40),
      metadata: { subscription_id: subscriptionId },
    },
    { idempotencyKey: `first-coupon-${subscriptionId}-${discountCents}` },
  );
  return coupon.id;
}

/**
 * Tras el primer cobro, cada descuento recurrente se materializa como un cupón
 * propio en la suscripción de Stripe (Stripe admite varios descuentos por
 * suscripción). Así cada uno caduca cuando le toca.
 */
export async function attachRecurringDiscounts(
  stripe: Stripe,
  stripeSubscriptionId: string,
  ourSubscriptionId: string,
  lines: QuoteLine[],
) {
  const discounts: { coupon: string }[] = [];
  for (const l of lines) {
    if (l.amountCents <= 0 || l.duration === "once") continue;
    const remaining = l.duration === "repeating" ? (l.durationMonths ?? 1) - 1 : null;
    if (remaining !== null && remaining <= 0) continue;
    const coupon = await stripe.coupons.create(
      {
        amount_off: l.amountCents,
        currency: "eur",
        name: l.label.slice(0, 40),
        duration: remaining === null ? "forever" : "repeating",
        ...(remaining !== null ? { duration_in_months: remaining } : {}),
        metadata: { subscription_id: ourSubscriptionId, discount_id: l.discountId, kind: l.kind },
      },
      { idempotencyKey: `recurring-${ourSubscriptionId}-${l.discountId}-${l.amountCents}` },
    );
    discounts.push({ coupon: coupon.id });
  }
  await stripe.subscriptions.update(stripeSubscriptionId, { discounts });
}
