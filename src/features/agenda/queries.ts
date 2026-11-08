import "server-only";
import { cache } from "react";
import { addDays } from "@/domain/billing/renewal";
import { madridInstant, slotsForDay, type AvailabilityRule, type ExceptionRange } from "@/domain/agenda/slots";
import { googleBusy } from "@/lib/google/calendar";
import { createClient } from "@/lib/supabase/server";

export const CREDIT_LABELS: Record<string, string> = {
  live_training: "Entrenos en directo",
  monthly_call: "Videollamada mensual",
  extra: "Sesiones extra",
};

export const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Hecha",
  no_show: "No se presentó",
};

export const getAppointmentTypes = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("appointment_types").select("*").order("sort_order");
  return data ?? [];
});

export type AppointmentType = Awaited<ReturnType<typeof getAppointmentTypes>>[number];

export async function getAgendaSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value").like("key", "agenda.%");
  const map = new Map((data ?? []).map((s) => [s.key, s.value]));
  return {
    fallbackMeetUrl: (map.get("agenda.fallback_meet_url") as string | null) ?? null,
    horizonDays: (map.get("agenda.booking_horizon_days") as number | undefined) ?? 28,
    stepMin: (map.get("agenda.slot_step_min") as number | undefined) ?? 30,
    extraCreditMonths: (map.get("agenda.extra_credit_months") as number | undefined) ?? 3,
  };
}

export async function getAvailability() {
  const supabase = await createClient();
  const [{ data: rules }, { data: exceptions }] = await Promise.all([
    supabase.from("availability").select("*").order("weekday").order("start_time"),
    supabase.from("availability_exceptions").select("*").gte("ends_at", new Date().toISOString()).order("starts_at"),
  ]);
  return { rules: rules ?? [], exceptions: exceptions ?? [] };
}

/** Huecos libres de un tipo para un día (Madrid). Incluye lo ocupado en el Google de Jaime. */
export async function getSlotsForDay(typeKey: string, date: string): Promise<string[]> {
  const supabase = await createClient();
  const types = await getAppointmentTypes();
  const type = types.find((t) => t.key === typeKey && t.is_active);
  if (!type) return [];
  const from = madridInstant(date, "00:00").toISOString();
  const to = madridInstant(addDays(date, 1), "00:00").toISOString();
  const [{ rules, exceptions }, { data: busy }, gBusy, settings] = await Promise.all([
    getAvailability(),
    supabase.rpc("busy_ranges", { p_from: from, p_to: to }),
    googleBusy(from, to),
    getAgendaSettings(),
  ]);
  return slotsForDay({
    date,
    type,
    rules: rules as AvailabilityRule[],
    exceptions: exceptions as ExceptionRange[],
    busy: [...(busy ?? []), ...gBusy],
    now: new Date(),
    stepMin: settings.stepMin,
  }).map((d) => d.toISOString());
}

export async function getCreditBalances(clientId: string) {
  const supabase = await createClient();
  const entries = await Promise.all(
    (["live_training", "monthly_call", "extra"] as const).map(async (t) => {
      const { data } = await supabase.rpc("client_credit_balance", { p_client_id: clientId, p_type: t });
      return [t, (data as number | null) ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<"live_training" | "monthly_call" | "extra", number>;
}

/** Caducidad más próxima de cada tipo de crédito con saldo (para "caducan el…"). */
export async function getCreditExpiries(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_credits")
    .select("credit_type, delta, expires_at")
    .eq("client_id", clientId)
    .gt("expires_at", new Date().toISOString());
  const buckets = new Map<string, number>();
  for (const r of data ?? [])
    buckets.set(`${r.credit_type}|${r.expires_at}`, (buckets.get(`${r.credit_type}|${r.expires_at}`) ?? 0) + r.delta);
  const out: Partial<Record<string, string>> = {};
  for (const [k, v] of [...buckets].sort()) {
    const [type, exp] = k.split("|") as [string, string];
    if (v > 0 && (!out[type] || exp < out[type]!)) out[type] = exp;
  }
  return out;
}

const APPT_FIELDS =
  "id, client_id, type_key, starts_at, ends_at, status, modality, location, meet_url, credit_type, client_notes, staff_notes, summary, goals, late_cancel, cancel_reason, appointment_types(name, cancel_notice_h, duration_min)";

export async function getClientAppointments(clientId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("appointments")
      .select(APPT_FIELDS)
      .eq("client_id", clientId)
      .eq("status", "confirmed")
      .gte("ends_at", now)
      .order("starts_at"),
    supabase
      .from("appointments")
      .select(APPT_FIELDS)
      .eq("client_id", clientId)
      .or(`status.neq.confirmed,ends_at.lt.${now}`)
      .order("starts_at", { ascending: false })
      .limit(30),
  ]);
  return { upcoming: upcoming ?? [], past: past ?? [] };
}

export type ClientAppointment = Awaited<ReturnType<typeof getClientAppointments>>["upcoming"][number];

export async function getNextAppointment(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(APPT_FIELDS)
    .eq("client_id", clientId)
    .eq("status", "confirmed")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getAppointment(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(`${APPT_FIELDS}, clients(id, profiles(full_name))`)
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Citas de la semana (staff) con el nombre del cliente. */
export async function getStaffWeek(monday: string) {
  const supabase = await createClient();
  const from = madridInstant(monday, "00:00").toISOString();
  const to = madridInstant(addDays(monday, 7), "00:00").toISOString();
  const { data } = await supabase
    .from("appointments")
    .select(`${APPT_FIELDS}, clients(id, profiles(full_name))`)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .neq("status", "cancelled")
    .order("starts_at");
  return data ?? [];
}

export type StaffAppointment = Awaited<ReturnType<typeof getStaffWeek>>[number];

export async function getCreditLedger(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_credits")
    .select("id, credit_type, delta, reason, period_start, expires_at, notes, created_at, appointment_id")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

/** Tipos que ve el cliente al reservar, con sus créditos y el motivo si no puede. */
export async function getBookableTypes(clientId: string, lastDay: string) {
  const supabase = await createClient();
  const [types, balances] = await Promise.all([getAppointmentTypes(), getCreditBalances(clientId)]);
  const out = [];
  for (const t of types.filter((x) => x.is_active && x.bookable_by_client)) {
    let blockedReason: string | null = null;
    if (t.feature_key) {
      const { data: has } = await supabase.rpc("has_feature", { p_client_id: clientId, p_feature: t.feature_key });
      if (!has) {
        const { data: pf } = await supabase
          .from("public_plan_features")
          .select("plan_id")
          .eq("feature_key", t.feature_key)
          .eq("enabled", true);
        const { data: plan } = await supabase
          .from("public_plans")
          .select("name")
          .in(
            "id",
            (pf ?? []).map((p) => p.plan_id!),
          )
          .order("sort_order")
          .limit(1)
          .maybeSingle();
        blockedReason = `Va en el plan ${plan?.name ?? "superior"}`;
      }
    }
    const credits = t.credit_types.length
      ? t.credit_types.reduce((s, ct) => s + (balances[ct as keyof typeof balances] ?? 0), 0)
      : null;
    if (!blockedReason && t.available_from && t.available_from > lastDay) {
      blockedReason = `Disponible a partir del ${new Date(`${t.available_from}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    if (!blockedReason && credits === 0) blockedReason = "No te quedan créditos este mes";
    if (!blockedReason && t.credit_types.length === 0) {
      // Citas sin crédito (sesión de arranque): una sola vez
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("type_key", t.key)
        .neq("status", "cancelled");
      if (count) blockedReason = "Ya la tienes reservada o hecha";
    }
    out.push({
      key: t.key,
      name: t.name,
      description: t.description,
      duration_min: t.duration_min,
      modality: t.modality,
      location: t.location,
      credits,
      blockedReason,
    });
  }
  return out;
}
