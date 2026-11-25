import "server-only";
import { checkinDueOn, checkinReminderDue, isCheckinMissed } from "@/domain/tracking/checkins";
import { todayInMadrid } from "@/lib/dates";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tarea diaria de check-ins: crea los que tocan según la frecuencia del cliente
 * (o la de su plan), recuerda los pendientes al día siguiente y marca como
 * perdidos los que llevan más de 7 días sin hacer.
 */
export async function runCheckinsJob(siteUrl: string) {
  const admin = createAdminClient();
  const today = todayInMadrid();
  const result = { created: 0, reminded: 0, missed: 0 };

  const [{ data: tpl }, { data: setting }, { data: clients }] = await Promise.all([
    admin.from("checkin_templates").select("id").eq("is_default", true).maybeSingle(),
    admin.from("settings").select("value").eq("key", "checkins.default_weekday").maybeSingle(),
    admin
      .from("clients")
      .select(
        "id, profile_id, started_at, onboarding_completed_at, checkin_frequency_days, checkin_weekday, plan_id, profiles(email, full_name)",
      )
      .eq("status", "active")
      .not("onboarding_completed_at", "is", null),
  ]);
  const defaultWeekday = typeof setting?.value === "number" ? setting.value : 6;

  for (const c of clients ?? []) {
    let freq = c.checkin_frequency_days;
    if (!freq) {
      const { data: f } = await admin.rpc("feature_for_client", { p_client_id: c.id, p_feature: "checkins" });
      if (!f?.[0]?.enabled) continue;
      freq = f[0].limit_value ?? 7;
    }
    const { data: last } = await admin
      .from("checkins")
      .select("due_on")
      .eq("client_id", c.id)
      .order("due_on", { ascending: false })
      .limit(1)
      .maybeSingle();
    const due = checkinDueOn({
      lastDueOn: last?.due_on ?? null,
      startedOn: c.started_at ?? c.onboarding_completed_at!.slice(0, 10),
      frequencyDays: freq,
      weekday: c.checkin_weekday ?? defaultWeekday,
      today,
    });
    if (!due) continue;
    const { error } = await admin
      .from("checkins")
      .insert({ client_id: c.id, template_id: tpl?.id ?? null, due_on: due });
    if (error) continue; // ya existía
    result.created++;
    await admin.rpc("notify", {
      p_profile_id: c.profile_id,
      p_type: "checkin_due",
      p_title: "Toca check-in",
      p_body: "3 minutos y Jaime ajusta tu plan. ¿Y tú, quieres ganar?",
      p_link: "/progreso/checkin",
      p_client_id: c.id,
    });
  }

  const { data: pending } = await admin
    .from("checkins")
    .select("id, client_id, due_on, reminded_at, clients(profile_id, profiles(email, full_name))")
    .eq("status", "pending");
  for (const p of pending ?? []) {
    if (isCheckinMissed(p.due_on, today)) {
      await admin.from("checkins").update({ status: "missed" }).eq("id", p.id);
      result.missed++;
    } else if (checkinReminderDue(p.due_on, today) && !p.reminded_at) {
      const prof = p.clients?.profiles;
      if (prof?.email) {
        await sendTemplateEmail({
          to: prof.email,
          templateKey: "checkin_due",
          vars: { nombre: prof.full_name.split(" ")[0] ?? "", enlace: `${siteUrl}/progreso/checkin` },
          cta: { label: "Hacer el check-in", href: `${siteUrl}/progreso/checkin` },
        });
      }
      await admin.from("checkins").update({ reminded_at: new Date().toISOString() }).eq("id", p.id);
      result.reminded++;
    }
  }
  return result;
}
