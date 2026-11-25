import "server-only";
import { formatSlot } from "@/domain/agenda/slots";
import { todayInMadrid } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantPeriodCredits } from "@/features/billing/fulfillment";

const H = 3_600_000;

/**
 * Tarea de agenda (cada 15 min es suficiente):
 * - recordatorios 24 h y 1 h antes de cada cita confirmada;
 * - marca como hechas las citas que acabaron hace más de 12 h sin cerrar;
 * - concede los créditos del mes a quien tenga suscripción activa (también anuales).
 */
export async function runAgendaJob() {
  const admin = createAdminClient();
  const now = Date.now();
  const result = { reminded24: 0, reminded1: 0, completed: 0, granted: 0 };

  const { data: soon } = await admin
    .from("appointments")
    .select(
      "id, client_id, starts_at, meet_url, modality, location, reminder_24h_at, reminder_1h_at, appointment_types(name), clients(profile_id)",
    )
    .eq("status", "confirmed")
    .gt("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 24 * H).toISOString());

  for (const a of soon ?? []) {
    const left = new Date(a.starts_at).getTime() - now;
    const which = left <= H && !a.reminder_1h_at ? "1h" : !a.reminder_24h_at && left > H ? "24h" : null;
    if (!which || !a.clients?.profile_id) continue;
    // Reclama el envío para no duplicar si dos crons se solapan
    const col = which === "1h" ? "reminder_1h_at" : "reminder_24h_at";
    const { data: claimed } = await admin
      .from("appointments")
      .update({
        [col]: new Date().toISOString(),
        ...(which === "1h" ? { reminder_24h_at: a.reminder_24h_at ?? new Date().toISOString() } : {}),
      })
      .eq("id", a.id)
      .is(col, null)
      .select("id");
    if (!claimed?.length) continue;
    const name = a.appointment_types?.name ?? "Cita";
    const where =
      a.modality === "online"
        ? a.meet_url
          ? `Enlace: ${a.meet_url}`
          : "Jaime te enviará el enlace."
        : `Lugar: ${a.location ?? "por confirmar"}`;
    await admin.rpc("notify", {
      p_profile_id: a.clients.profile_id,
      p_type: "appointment_reminder",
      p_title: which === "1h" ? `${name} en 1 hora` : `${name} mañana`,
      p_body: `${formatSlot(a.starts_at)}. ${where}`,
      p_link: "/agenda",
      p_client_id: a.client_id,
    });
    result[which === "1h" ? "reminded1" : "reminded24"]++;
  }

  const { data: done } = await admin
    .from("appointments")
    .update({ status: "completed" })
    .eq("status", "confirmed")
    .lt("ends_at", new Date(now - 12 * H).toISOString())
    .select("id");
  result.completed = done?.length ?? 0;

  // Créditos mensuales: idempotente gracias al índice único (cliente, tipo, periodo)
  const { data: subs } = await admin
    .from("subscriptions")
    .select("client_id, current_period_start, clients!inner(status)")
    .eq("status", "active")
    .not("current_period_start", "is", null);
  const today = todayInMadrid();
  for (const s of subs ?? []) {
    if (s.clients?.status !== "active") continue;
    await grantPeriodCredits(s.client_id, s.current_period_start!, today);
    result.granted++;
  }
  return result;
}
