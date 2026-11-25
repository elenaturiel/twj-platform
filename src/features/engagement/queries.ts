import "server-only";
import { todayInMadrid } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export async function getStreak(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("client_streaks").select("*").eq("client_id", clientId).maybeSingle();
  return data;
}

export async function getBadges(clientId: string) {
  const supabase = await createClient();
  const [{ data: all }, { data: mine }] = await Promise.all([
    supabase
      .from("badges")
      .select("key, name, description, icon, kind, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("client_badges").select("badge_key, awarded_at, seen_at").eq("client_id", clientId),
  ]);
  const owned = new Map((mine ?? []).map((b) => [b.badge_key, b]));
  return (all ?? []).map((b) => ({
    ...b,
    awardedAt: owned.get(b.key)?.awarded_at ?? null,
    seen: Boolean(owned.get(b.key)?.seen_at),
  }));
}

export async function getUnseenBadges(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_badges")
    .select("badge_key, badges(name, description, icon)")
    .eq("client_id", clientId)
    .is("seen_at", null)
    .limit(5);
  return (data ?? []).map((b) => ({
    key: b.badge_key,
    name: b.badges?.name ?? "",
    description: b.badges?.description ?? "",
    icon: b.badges?.icon ?? "🏅",
  }));
}

export async function getChallengesForClient(clientId: string) {
  const supabase = await createClient();
  const today = todayInMadrid();
  const [{ data: challenges }, { data: mine }, { data: client }] = await Promise.all([
    supabase
      .from("challenges")
      .select("id, title, description, starts_on, ends_on, rule, plan_keys, badge_key")
      .eq("is_active", true)
      .order("starts_on"),
    supabase
      .from("challenge_participants")
      .select("challenge_id, progress, completed_at, joined_at")
      .eq("client_id", clientId),
    supabase.from("clients").select("plans(key)").eq("id", clientId).single(),
  ]);
  const planKey = client?.plans?.key ?? "";
  const joined = new Map((mine ?? []).map((m) => [m.challenge_id, m]));
  return (challenges ?? [])
    .filter((c) => c.plan_keys.length === 0 || c.plan_keys.includes(planKey) || joined.has(c.id))
    .map((c) => ({ ...c, me: joined.get(c.id) ?? null, open: c.ends_on >= today, upcoming: c.starts_on > today }));
}
