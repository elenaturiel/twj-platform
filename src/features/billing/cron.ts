import "server-only";
import { addDays, manualStatusOn, reminderDue } from "@/domain/billing/renewal";
import { todayInMadrid } from "@/lib/dates";
import { formatEuros } from "@/lib/money";
import { sendTemplateEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { markPastDue } from "./fulfillment";

/**
 * Tarea diaria de cobros:
 * - caduca reservas de descuentos (fundador incluido) de checkouts abandonados;
 * - suscripciones manuales: recordatorios (−3, 0, +3 días…) y paso a past_due al vencer;
 * - referidos: pasan a "cualificados" 14 días después del primer pago del amigo.
 * Los cobros de Stripe los mueve el webhook, no esta tarea.
 */
export async function runBillingJob(siteUrl: string) {
  const admin = createAdminClient();
  const today = todayInMadrid();
  const result = { expiredReservations: 0, reminders: 0, pastDue: 0, referralsQualified: 0 };

  const { data: expired } = await admin.rpc("expire_discount_reservations");
  result.expiredReservations = expired ?? 0;

  const { data: settings } = await admin
    .from("settings")
    .select("key, value")
    .in("key", ["billing.grace_days", "billing.manual_reminder_offsets"]);
  const graceDays = (settings?.find((s) => s.key === "billing.grace_days")?.value as number | undefined) ?? 5;
  const offsets = (settings?.find((s) => s.key === "billing.manual_reminder_offsets")?.value as
    number[] | undefined) ?? [-3, 0, 3];

  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, client_id, status, amount_cents, current_period_end, plans(name), clients(profiles(email, full_name))")
    .eq("billing_mode", "manual")
    .in("status", ["active", "past_due"])
    .not("current_period_end", "is", null);

  for (const s of subs ?? []) {
    const periodEnd = s.current_period_end!;
    const status = manualStatusOn({ periodEnd, today, graceDays });
    if (status.status === "past_due" && s.status === "active") {
      await markPastDue(s.id, siteUrl, "overdue");
      result.pastDue++;
    }

    const offset = reminderDue({ periodEnd, today, offsets });
    if (offset !== null && s.clients?.profiles?.email) {
      await sendTemplateEmail({
        to: s.clients.profiles.email,
        templateKey: "payment_reminder",
        vars: {
          nombre: s.clients.profiles.full_name.split(" ")[0] ?? "",
          plan: s.plans?.name ?? "",
          importe: formatEuros(s.amount_cents),
          fecha: periodEnd,
        },
      });
      if (offset <= 0) {
        await admin.rpc("notify_staff", {
          p_type: "renewal_upcoming",
          p_title: `${offset === 0 ? "Vence hoy" : `Vence en ${-offset} días`}: ${s.clients.profiles.full_name}`,
          p_body: `${s.plans?.name ?? ""} · ${formatEuros(s.amount_cents)} · pago manual`,
          p_link: `/panel/clientes/${s.client_id}/pagos`,
          p_client_id: s.client_id,
        });
      }
      result.reminders++;
    }
  }

  const { data: pendingRefs } = await admin
    .from("referrals")
    .select("id, clients:referred_client_id(status, started_at)")
    .eq("status", "pending");
  for (const r of pendingRefs ?? []) {
    const c = r.clients;
    if (c && c.status === "active" && c.started_at && c.started_at <= addDays(today, -14)) {
      await admin
        .from("referrals")
        .update({ status: "qualified", qualified_at: new Date().toISOString() })
        .eq("id", r.id);
      result.referralsQualified++;
    }
  }
  return result;
}
