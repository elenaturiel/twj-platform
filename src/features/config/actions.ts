"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireScope, requireStaff } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type ConfigResult = { ok: true } | { ok: false; error: string };

const planSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(1000),
  priceEuros: z.number().min(0).max(10000).nullable(),
  isActive: z.boolean(),
  highlights: z.array(z.string().trim().min(1).max(160)).max(12),
});

/**
 * Edita un plan. Si cambia el precio, solo afecta a altas nuevas: las
 * suscripciones existentes guardan su precio de lista (grandfathering) y en
 * Stripe se crea un Price nuevo la próxima vez que haga falta.
 */
export async function updatePlan(input: z.input<typeof planSchema>): Promise<ConfigResult> {
  await requireScope("billing");
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los datos del plan." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("plans")
    .select("price_cents, requires_application, annual_allowed")
    .eq("id", d.id)
    .single();
  if (!before) return { ok: false, error: "Plan no encontrado." };
  const priceCents = before.requires_application ? null : d.priceEuros === null ? null : Math.round(d.priceEuros * 100);

  const { error } = await supabase
    .from("plans")
    .update({
      name: d.name,
      tagline: d.tagline,
      description: d.description,
      price_cents: priceCents,
      is_active: d.isActive,
      highlights: d.highlights,
    })
    .eq("id", d.id);
  if (error) return { ok: false, error: "No se ha podido guardar." };

  if (priceCents !== null && priceCents !== before.price_cents) {
    const now = new Date().toISOString();
    await supabase.from("plan_prices").update({ valid_to: now }).eq("plan_id", d.id).is("valid_to", null);
    await supabase
      .from("plan_prices")
      .insert([
        { plan_id: d.id, interval: "month", amount_cents: priceCents },
        ...(before.annual_allowed ? [{ plan_id: d.id, interval: "year", amount_cents: priceCents * 12 }] : []),
      ]);
  }
  revalidatePath("/panel/planes");
  revalidatePath("/empezar");
  return { ok: true };
}

export async function setPlanFeature(input: {
  planId: string;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  label: string | null;
}): Promise<ConfigResult> {
  await requireScope("billing");
  const supabase = await createClient();
  const { error } = await supabase.from("plan_features").upsert(
    {
      plan_id: input.planId,
      feature_key: input.featureKey,
      enabled: input.enabled,
      limit_value: input.limitValue,
      label: input.label?.trim() || null,
    },
    { onConflict: "plan_id,feature_key" },
  );
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/planes");
  return { ok: true };
}

const discountSchema = z.object({
  id: z.uuid().optional(),
  code: z.string().trim().max(40).nullable(),
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["founder", "student", "squad", "annual", "custom"]),
  type: z.enum(["percent", "fixed", "tiered_percent"]),
  value: z.number().nullable(),
  tiers: z.array(z.object({ min_friends: z.number().int().min(1), percent: z.number().min(0).max(100) })).nullable(),
  duration: z.enum(["once", "repeating", "forever"]),
  durationMonths: z.number().int().min(1).max(36).nullable(),
  appliesToPlanKeys: z.array(z.string()).nullable(),
  maxRedemptions: z.number().int().min(0).nullable(),
  expiresAt: z.string().nullable(),
  stackable: z.boolean(),
  isActive: z.boolean(),
});

export async function saveDiscount(input: z.input<typeof discountSchema>): Promise<ConfigResult> {
  await requireScope("billing");
  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el descuento." };
  const d = parsed.data;
  const row = {
    code: d.code || null,
    name: d.name,
    kind: d.kind,
    type: d.type,
    value: d.type === "fixed" && d.value !== null ? Math.round(d.value * 100) : d.value,
    tiers: d.tiers,
    duration: d.duration,
    duration_months: d.duration === "repeating" ? d.durationMonths : null,
    applies_to_plan_keys: d.appliesToPlanKeys?.length ? d.appliesToPlanKeys : null,
    max_redemptions: d.maxRedemptions,
    expires_at: d.expiresAt || null,
    stackable: d.stackable,
    is_active: d.isActive,
  };
  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("discounts").update(row).eq("id", d.id)
    : await supabase.from("discounts").insert(row);
  if (error) return { ok: false, error: error.code === "23505" ? "Ese código ya existe." : "No se ha podido guardar." };
  revalidatePath("/panel/planes");
  return { ok: true };
}

const SETTING_KEYS = [
  "contact.whatsapp_number",
  "contact.email",
  "billing.grace_days",
  "billing.manual_reminder_offsets",
  "billing.extra_session_price_cents",
  "billing.max_total_discount_percent",
  "notifications.digest_hour",
  "checkins.default_weekday",
] as const;

export async function saveSetting(key: string, rawValue: string): Promise<ConfigResult> {
  await requireScope("settings");
  if (!SETTING_KEYS.includes(key as (typeof SETTING_KEYS)[number])) return { ok: false, error: "Ajuste no editable." };
  let value: unknown;
  try {
    value = rawValue.trim() === "" ? null : JSON.parse(rawValue);
  } catch {
    value = rawValue.trim(); // texto suelto → string
  }
  if (
    key === "contact.whatsapp_number" &&
    (typeof value !== "string" || !/^\+?\d{9,15}$/.test(value.replace(/\s/g, "")))
  ) {
    return { ok: false, error: "Número no válido (formato +34…)." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ value: value as never })
    .eq("key", key);
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/ajustes");
  return { ok: true };
}

/** Preferencia del propio staff: recibir los avisos por email en un resumen diario. */
export async function setDigestPreference(digest: boolean): Promise<ConfigResult> {
  const viewer = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { profile_id: viewer.id, type: "*", channel: "email", enabled: true, digest },
      { onConflict: "profile_id,type,channel" },
    );
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/ajustes");
  return { ok: true };
}

export async function markNotificationsRead(ids?: string[]): Promise<ConfigResult> {
  const viewer = await requireStaff();
  const supabase = await createClient();
  let q = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("profile_id", viewer.id)
    .is("read_at", null);
  if (ids?.length) q = q.in("id", ids);
  await q;
  revalidatePath("/panel", "layout");
  return { ok: true };
}
