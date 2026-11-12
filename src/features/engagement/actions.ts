"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getClientContext, requireScope } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { parseRule } from "@/domain/engagement/engagement";
import { evaluateQuietly } from "./engine.server";

export type EngagementResult = { ok: true } | { ok: false; error: string };

export async function joinChallenge(id: string): Promise<EngagementResult> {
  const ctx = await getClientContext();
  if (!ctx || ctx.access.kind !== "ok") return { ok: false, error: "Sin acceso." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_challenge", { p_challenge: id });
  if (error)
    return { ok: false, error: error.message.startsWith("Este reto") ? error.message : "No te has podido unir." };
  // Calcula ya el progreso (lo que llevas desde que empezó el reto cuenta)
  await evaluateQuietly(ctx.client.id);
  revalidatePath("/retos");
  return { ok: true };
}

export async function leaveChallenge(id: string): Promise<EngagementResult> {
  const supabase = await createClient();
  await supabase.rpc("leave_challenge", { p_challenge: id });
  revalidatePath("/retos");
  return { ok: true };
}

/** La animación de medalla nueva ya se ha mostrado. */
export async function markBadgesSeen(keys: string[]) {
  const ctx = await getClientContext();
  if (!ctx || !keys.length) return;
  const supabase = await createClient();
  await supabase
    .from("client_badges")
    .update({ seen_at: new Date().toISOString() })
    .eq("client_id", ctx.client.id)
    .in("badge_key", keys.slice(0, 20));
}

const challengeSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().max(1000).optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ends_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rule: z.object({ type: z.string(), target: z.number().positive(), metric: z.string().optional() }),
  badge_key: z.string().optional(),
  plan_keys: z.array(z.string()).default([]),
  is_active: z.boolean(),
});

export async function saveChallenge(input: z.input<typeof challengeSchema>): Promise<EngagementResult> {
  const viewer = await requireScope("clients");
  const p = challengeSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Revisa el reto." };
  if (p.data.ends_on < p.data.starts_on) return { ok: false, error: "La fecha de fin es anterior a la de inicio." };
  const rule = parseRule(p.data.rule);
  if (!rule) return { ok: false, error: "La regla del reto no es válida." };
  const supabase = await createClient();
  const { id, badge_key, description, ...row } = p.data;
  const values = { ...row, rule, badge_key: badge_key || null, description: description || null };
  const { error } = id
    ? await supabase.from("challenges").update(values).eq("id", id)
    : await supabase.from("challenges").insert({ ...values, created_by: viewer.id });
  if (error) return { ok: false, error: "No se ha podido guardar." };
  revalidatePath("/panel/retos");
  revalidatePath("/retos");
  return { ok: true };
}
