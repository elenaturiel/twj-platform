/**
 * Datos semilla de DESARROLLO (ficticios). Uso: `pnpm db:reset && pnpm db:seed`.
 * Se niega a ejecutarse contra un Supabase que no sea local.
 *
 * Usuarios (contraseña para todos: twj-demo-1234):
 *   jaime@twj.local (owner) · elena@twj.local (admin) · 6 clientes cliente1..6@twj.local
 *
 * Cada fase amplía este script con su historial (entrenos, métricas, menús…).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY (.env.local)");
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) && !process.argv.includes("--force")) {
  throw new Error(`Seed bloqueado: ${url} no es local. Usa --force solo si sabes lo que haces.`);
}

const db = createClient<Database>(url, key, { auth: { persistSession: false } });
const PASSWORD = "twj-demo-1234";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCMonth(r.getUTCMonth() + n);
  return r;
}

async function must<T>(
  p: PromiseLike<{ data: T; error: { message: string } | null }>,
  what: string,
): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data == null) throw new Error(`${what}: ${error?.message ?? "sin datos"}`);
  return data;
}

async function createUser(email: string, fullName: string) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user.id;
}

type SeedClient = {
  n: number;
  name: string;
  plan: "rookie" | "all_in" | "mvp" | "peak";
  modalities: string[];
  billing: "stripe" | "manual";
  interval?: "month" | "year";
  status: "active" | "past_due";
  monthsAgo: number;
  onboarded: boolean;
  method?: "bizum" | "transfer" | "cash";
  founder?: boolean;
  tags?: string[];
  intake: Database["public"]["Tables"]["client_intake"]["Insert"] extends infer I
    ? Omit<I & object, "client_id">
    : never;
};

const clients: SeedClient[] = [
  {
    n: 1,
    name: "Lucía Martín",
    plan: "rookie",
    modalities: ["running"],
    billing: "stripe",
    status: "active",
    monthsAgo: 0,
    onboarded: false,
    tags: ["nueva"],
    intake: { goal: "Correr mi primer 10K sin morir", experience: "beginner" },
  },
  {
    n: 2,
    name: "Pablo Ruiz",
    plan: "all_in",
    modalities: ["gym"],
    billing: "manual",
    method: "bizum",
    status: "active",
    monthsAgo: 5,
    onboarded: true,
    tags: ["uni-navarra"],
    intake: {
      goal: "Ganar masa muscular",
      birth_date: "2004-03-12",
      experience: "intermediate",
      equipment: "gym",
      available_days: [1, 3, 5],
      allergens: [],
      food_budget_cents: 4000,
      food_budget_period: "week",
      class_schedule: "Mañanas de 8 a 14",
      injuries: "Molestia leve en hombro derecho",
    },
  },
  {
    n: 3,
    name: "Marta Gómez",
    plan: "all_in",
    modalities: ["functional"],
    billing: "stripe",
    status: "past_due",
    monthsAgo: 3,
    onboarded: true,
    intake: {
      goal: "Perder grasa y ganar fuerza",
      birth_date: "2003-09-01",
      experience: "beginner",
      equipment: "home",
      available_days: [2, 4, 6],
      allergens: ["milk"],
      allergy_notes: "Intolerancia a la lactosa",
      food_budget_cents: 3500,
      food_budget_period: "week",
      class_schedule: "Tardes",
    },
  },
  {
    n: 4,
    name: "Diego Sánchez",
    plan: "mvp",
    modalities: ["hyrox", "gym"],
    billing: "stripe",
    status: "active",
    monthsAgo: 2,
    onboarded: true,
    founder: true,
    tags: ["hyrox-2026"],
    intake: {
      goal: "Terminar el HYROX de noviembre en menos de 1h30",
      birth_date: "2002-06-20",
      experience: "advanced",
      equipment: "gym",
      available_days: [1, 2, 4, 5, 6],
      allergens: [],
      food_budget_cents: 5000,
      food_budget_period: "week",
      class_schedule: "Prácticas de 9 a 15",
    },
  },
  {
    n: 5,
    name: "Irene López",
    plan: "mvp",
    modalities: ["running"],
    billing: "manual",
    method: "transfer",
    interval: "year",
    status: "active",
    monthsAgo: 1,
    onboarded: true,
    intake: {
      goal: "Media maratón en primavera",
      birth_date: "2001-11-30",
      experience: "intermediate",
      equipment: "both",
      available_days: [0, 2, 4, 6],
      allergens: ["gluten"],
      food_budget_cents: 4500,
      food_budget_period: "week",
    },
  },
  {
    n: 6,
    name: "Álvaro Fernández",
    plan: "peak",
    modalities: ["hyrox"],
    billing: "manual",
    method: "bizum",
    status: "active",
    monthsAgo: 1,
    onboarded: true,
    tags: ["peak-10-semanas"],
    intake: {
      goal: "Preparar HYROX dobles (14-11-2026)",
      birth_date: "2003-01-15",
      experience: "advanced",
      equipment: "gym",
      available_days: [1, 2, 3, 4, 5, 6],
      allergens: [],
      food_budget_cents: 6000,
      food_budget_period: "week",
    },
  },
];

async function main() {
  console.log("→ Staff");
  const jaime = await createUser("jaime@twj.local", "Jaime");
  const elena = await createUser("elena@twj.local", "Elena");
  await must(db.from("profiles").update({ role: "owner" }).eq("id", jaime).select(), "role owner");
  await must(db.from("profiles").update({ role: "admin" }).eq("id", elena).select(), "role admin");
  await must(
    db
      .from("staff_permissions")
      .insert(
        (["clients", "health", "billing", "business", "settings", "team"] as const).map((scope) => ({
          profile_id: elena,
          scope,
        })),
      )
      .select(),
    "permisos Elena",
  );

  const plans = await must(db.from("plans").select("id, key, price_cents"), "planes");
  const planBy = new Map(plans.map((p) => [p.key, p]));
  const discounts = await must(db.from("discounts").select("id, kind"), "descuentos");
  const founder = discounts.find((d) => d.kind === "founder");
  const annual = discounts.find((d) => d.kind === "annual");

  const today = new Date();
  console.log("→ Clientes");
  for (const c of clients) {
    const profileId = await createUser(`cliente${c.n}@twj.local`, c.name);
    const plan = planBy.get(c.plan)!;
    const started = addMonths(today, -c.monthsAgo);
    const interval = c.interval ?? "month";

    const [client] = await must(
      db
        .from("clients")
        .insert({
          profile_id: profileId,
          status: c.status,
          plan_id: plan.id,
          billing_mode: c.billing,
          billing_interval: interval,
          modalities: c.modalities,
          tags: c.tags ?? [],
          referral_code: `TWJ-${c.name
            .split(" ")[0]!
            .toUpperCase()
            .normalize("NFD")
            .replace(/[^A-Z]/g, "")}${c.n}`,
          started_at: iso(started),
          onboarding_completed_at: c.onboarded ? started.toISOString() : null,
          last_activity_at: addDays(today, -(c.n % 4) * 3).toISOString(),
          checkin_frequency_days: c.plan === "rookie" ? 14 : 7,
        })
        .select("id"),
      `cliente ${c.name}`,
    );
    const clientId = client!.id;

    await must(
      db
        .from("client_intake")
        .insert({ client_id: clientId, ...c.intake })
        .select(),
      `ficha ${c.name}`,
    );

    // Importes (céntimos, IVA incl.). Peak: sin importe en semilla (se pacta en el panel).
    const monthly = plan.price_cents ?? 0;
    const months = interval === "year" ? 12 : 1;
    const list = monthly * months;
    const breakdown: { kind: string; label: string; percent?: number; amount_cents?: number }[] = [];
    let amount = list;
    if (c.founder) {
      breakdown.push({ kind: "founder", label: "Precio fundador", amount_cents: 500 * months });
      amount -= 500 * months;
    }
    if (interval === "year") {
      breakdown.push({ kind: "annual", label: "Pago anual", percent: 20 });
      amount = Math.round(amount * 0.8);
    }

    const periodStart = addMonths(started, Math.floor(c.monthsAgo / months) * months);
    const periodEnd = addMonths(periodStart, months);
    const [sub] = await must(
      db
        .from("subscriptions")
        .insert({
          client_id: clientId,
          plan_id: plan.id,
          billing_mode: c.billing,
          billing_interval: interval,
          status: c.status,
          list_price_cents: list,
          amount_cents: amount,
          discount_breakdown: breakdown,
          anchor_day: started.getUTCDate(),
          current_period_start: iso(c.status === "past_due" ? addMonths(periodStart, -1) : periodStart),
          current_period_end: iso(c.status === "past_due" ? periodStart : periodEnd),
          grace_until: c.status === "past_due" ? iso(addDays(today, 3)) : null,
          started_at: started.toISOString(),
          stripe_subscription_id: c.billing === "stripe" ? `sub_demo_${c.n}` : null,
        })
        .select("id"),
      `suscripción ${c.name}`,
    );

    // Historial de pagos (uno por periodo ya cubierto)
    const paidPeriods = c.status === "past_due" ? Math.max(c.monthsAgo, 1) : Math.floor(c.monthsAgo / months) + 1;
    const payments = Array.from({ length: paidPeriods }, (_, i) => {
      const ps = addMonths(started, i * months);
      return {
        client_id: clientId,
        subscription_id: sub!.id,
        kind: "subscription",
        method: c.billing === "stripe" ? "stripe" : c.method!,
        status: "paid",
        amount_cents: amount,
        discount_cents: list - amount,
        paid_at: ps.toISOString(),
        period_start: iso(ps),
        period_end: iso(addMonths(ps, months)),
        description: `Cuota ${plan.key} ${iso(ps).slice(0, 7)}`,
        recorded_by: c.billing === "manual" ? jaime : null,
      } as const;
    });
    if (c.plan !== "peak") await must(db.from("payments").insert(payments).select("id"), `pagos ${c.name}`);

    if (c.founder && founder) {
      await must(
        db
          .from("discount_redemptions")
          .insert({
            discount_id: founder.id,
            client_id: clientId,
            subscription_id: sub!.id,
            status: "applied",
            applied_at: started.toISOString(),
          })
          .select(),
        "fundador",
      );
    }
    if (interval === "year" && annual) {
      await must(
        db
          .from("discount_redemptions")
          .insert({
            discount_id: annual.id,
            client_id: clientId,
            subscription_id: sub!.id,
            status: "applied",
            applied_at: started.toISOString(),
          })
          .select(),
        "anual",
      );
    }

    if (c.plan === "mvp" || c.plan === "peak") {
      await must(
        db
          .from("session_credits")
          .insert([
            {
              client_id: clientId,
              credit_type: "live_training",
              delta: 2,
              reason: "monthly_grant",
              period_start: iso(periodStart),
            },
            {
              client_id: clientId,
              credit_type: "monthly_call",
              delta: 1,
              reason: "monthly_grant",
              period_start: iso(periodStart),
            },
          ])
          .select(),
        "créditos",
      );
    }

    if (c.onboarded) {
      await must(
        db
          .from("onboarding_calls")
          .insert({
            client_id: clientId,
            held_at: started.toISOString(),
            notes: "Llamada de onboarding (dato de demo).",
            agreed_goals: c.intake.goal ?? null,
            metrics_to_track: "Peso semanal, sensaciones, RPE medio",
            created_by: jaime,
          })
          .select(),
        "llamada onboarding",
      );
    }
    console.log(`  ✓ ${c.name} (${c.plan}, ${c.billing}, ${c.status})`);
  }

  // Un cambio de ficha reciente para ver avisos en el panel
  const { data: pablo } = await db.from("clients").select("id, profile_id").eq("referral_code", "TWJ-PABLO2").single();
  if (pablo) {
    await db.from("profile_changes").insert({
      client_id: pablo.id,
      changed_by: pablo.profile_id,
      table_name: "client_intake",
      field: "available_days",
      old_value: [1, 3],
      new_value: [1, 3, 5],
    });
  }

  console.log(`\nListo. Contraseña de todos los usuarios: ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
