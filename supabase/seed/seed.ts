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
import type { Database, Json } from "../../src/types/database";

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
  // Idempotente por fases: cada bloque solo se carga si aún no está
  const { data: existing } = await db.from("profiles").select("id").eq("email", "jaime@twj.local").maybeSingle();
  if (existing) console.log("Fase 1 ya cargada.");
  else await seedPhase1();
  await seedTraining();
  await seedTracking();
  console.log(`\nListo. Contraseña de todos los usuarios: ${PASSWORD}`);
}

async function seedPhase1() {
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
}

// ───────────────────────────── Fase 2: entrenamiento ─────────────────────────────

type SeedItem = { exercise: string; p: Record<string, unknown> };
type SeedPart = {
  modality: "gym" | "functional" | "running" | "hyrox";
  format: string;
  params?: Record<string, unknown>;
  title?: string;
  items: SeedItem[];
};
type SeedSession = { title: string; day: number; parts: SeedPart[] };

const SESSIONS: Record<string, SeedSession[]> = {
  gym: [
    {
      title: "Pierna",
      day: 0,
      parts: [
        {
          modality: "gym",
          format: "straight",
          items: [
            { exercise: "Sentadilla trasera", p: { sets: 4, reps: "6-8", load_kg: 70, rpe: 8, rest_s: 150 } },
            { exercise: "Peso muerto rumano", p: { sets: 3, reps: "10", load_kg: 50, rpe: 7, rest_s: 90 } },
            { exercise: "Zancada búlgara", p: { sets: 3, reps: "10/10", load_kg: 12, rest_s: 60 } },
          ],
        },
      ],
    },
    {
      title: "Torso",
      day: 2,
      parts: [
        {
          modality: "gym",
          format: "straight",
          items: [
            { exercise: "Press banca", p: { sets: 4, reps: "6-8", load_kg: 50, rpe: 8, rest_s: 150 } },
            { exercise: "Dominadas", p: { sets: 4, reps: "6-8", rest_s: 120 } },
            { exercise: "Press militar", p: { sets: 3, reps: "8-10", load_kg: 30, rest_s: 90 } },
          ],
        },
      ],
    },
    {
      title: "Full body + core",
      day: 4,
      parts: [
        {
          modality: "gym",
          format: "straight",
          items: [
            { exercise: "Peso muerto", p: { sets: 3, reps: "5", load_kg: 90, rpe: 8, rest_s: 180 } },
            { exercise: "Remo con barra", p: { sets: 3, reps: "10", load_kg: 40, rest_s: 90 } },
            { exercise: "Plancha", p: { sets: 3, duration_s: 45, rest_s: 45 } },
          ],
        },
      ],
    },
  ],
  running: [
    {
      title: "Rodaje suave",
      day: 1,
      parts: [
        {
          modality: "running",
          format: "run",
          items: [
            {
              exercise: "Rodaje suave",
              p: { run_type: "rodaje", distance_m: 6000, pace_min_s: 360, pace_max_s: 390, hr_zone: "Z2" },
            },
          ],
        },
      ],
    },
    {
      title: "Series",
      day: 3,
      parts: [
        {
          modality: "running",
          format: "run",
          title: "Calentamiento",
          items: [{ exercise: "Rodaje suave", p: { run_type: "calentamiento", duration_s: 900, hr_zone: "Z1-Z2" } }],
        },
        {
          modality: "running",
          format: "run",
          title: "Bloque principal",
          items: [
            {
              exercise: "Series",
              p: { run_type: "series", repeat: 6, distance_m: 400, pace_min_s: 270, pace_max_s: 285, rest_s: 90 },
            },
          ],
        },
      ],
    },
    {
      title: "Tirada larga",
      day: 6,
      parts: [
        {
          modality: "running",
          format: "run",
          items: [
            {
              exercise: "Tirada larga",
              p: { run_type: "tirada_larga", distance_m: 12000, pace_min_s: 375, pace_max_s: 405, hr_zone: "Z2" },
            },
          ],
        },
      ],
    },
  ],
  functional: [
    {
      title: "WOD 1",
      day: 1,
      parts: [
        {
          modality: "functional",
          format: "amrap",
          params: { minutes: 12 },
          items: [
            { exercise: "Kettlebell swing", p: { reps: "15", load_kg: 16 } },
            { exercise: "Burpees", p: { reps: "10" } },
            { exercise: "Box jump", p: { reps: "12" } },
          ],
        },
      ],
    },
    {
      title: "EMOM + fuerza",
      day: 3,
      parts: [
        {
          modality: "gym",
          format: "straight",
          items: [{ exercise: "Sentadilla goblet", p: { sets: 4, reps: "10", load_kg: 20, rest_s: 90 } }],
        },
        {
          modality: "functional",
          format: "emom",
          params: { minutes: 10, every_s: 60 },
          items: [{ exercise: "Thruster", p: { reps: "10", load_kg: 20 } }],
        },
      ],
    },
  ],
  hyrox: [
    {
      title: "Fuerza HYROX",
      day: 0,
      parts: [
        {
          modality: "gym",
          format: "straight",
          items: [
            { exercise: "Sentadilla trasera", p: { sets: 4, reps: "5", load_kg: 90, rpe: 8, rest_s: 150 } },
            { exercise: "Peso muerto", p: { sets: 3, reps: "5", load_kg: 110, rest_s: 180 } },
          ],
        },
      ],
    },
    {
      title: "Estaciones + carrera",
      day: 2,
      parts: [
        {
          modality: "running",
          format: "run",
          items: [
            {
              exercise: "Series",
              p: { run_type: "series", repeat: 4, distance_m: 1000, pace_min_s: 270, pace_max_s: 280, rest_s: 60 },
            },
          ],
        },
        {
          modality: "hyrox",
          format: "hyrox_stations",
          params: { category: "Open" },
          items: [
            { exercise: "SkiErg", p: { station_key: "skierg", distance_m: 1000, target_split_s: 255 } },
            { exercise: "Wall ball", p: { station_key: "wall_balls", reps: "100", target_split_s: 330 } },
          ],
        },
      ],
    },
    {
      title: "Simulacro parcial",
      day: 5,
      parts: [
        {
          modality: "hyrox",
          format: "hyrox_sim",
          params: { time_cap_s: 2700, category: "Open" },
          items: [
            { exercise: "Sled Push", p: { station_key: "sled_push", distance_m: 50 } },
            { exercise: "Sled Pull", p: { station_key: "sled_pull", distance_m: 50 } },
            { exercise: "Burpee Broad Jumps", p: { station_key: "burpee_broad_jumps", distance_m: 80 } },
            { exercise: "Farmers Carry", p: { station_key: "farmers_carry", distance_m: 200 } },
          ],
        },
      ],
    },
  ],
};

function lastMonday(d: Date) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  r.setUTCDate(r.getUTCDate() - ((r.getUTCDay() + 6) % 7));
  return r;
}

async function seedTraining() {
  const { count } = await db.from("workout_blocks").select("id", { count: "exact", head: true });
  if (count) return console.log("Fase 2 ya cargada.");
  console.log("→ Entrenamiento");
  const { data: exercises } = await db.from("exercises").select("id, name");
  const ex = new Map((exercises ?? []).map((e) => [e.name, e.id]));
  const { data: clients } = await db
    .from("clients")
    .select("id, modalities, onboarding_completed_at, profiles(full_name)")
    .not("onboarding_completed_at", "is", null);
  const start = lastMonday(addDays(new Date(), -14)); // bloque empezado hace 2 semanas
  const today = new Date();

  for (const c of clients ?? []) {
    const modality = (c.modalities[0] ?? "gym") as keyof typeof SESSIONS;
    const sessions = SESSIONS[modality] ?? SESSIONS.gym!;
    const [block] = await must(
      db
        .from("workout_blocks")
        .insert({
          client_id: c.id,
          name: `Bloque 1 · ${modality === "running" ? "Base aeróbica" : modality === "hyrox" ? "HYROX 14-11" : "Fuerza base"}`,
          goal: "Dato de demo",
          starts_on: iso(start),
          status: "active",
        })
        .select("id"),
      "bloque",
    );
    for (let w = 0; w < 4; w++) {
      const [week] = await must(
        db
          .from("workout_weeks")
          .insert({ block_id: block!.id, client_id: c.id, week_index: w, is_deload: w === 3 })
          .select("id"),
        "semana",
      );
      for (const [si, s] of sessions.entries()) {
        const [session] = await must(
          db
            .from("workout_sessions")
            .insert({ week_id: week!.id, client_id: c.id, title: s.title, day_index: s.day, sort_order: si })
            .select("id"),
          "sesión",
        );
        for (const [pi, p] of s.parts.entries()) {
          const [part] = await must(
            db
              .from("session_parts")
              .insert({
                session_id: session!.id,
                client_id: c.id,
                modality: p.modality,
                format: p.format,
                params: (p.params ?? {}) as NonNullable<Json>,
                title: p.title ?? null,
                sort_order: pi,
              })
              .select("id"),
            "parte",
          );
          const items = p.items.map((it, ii) => ({
            part_id: part!.id,
            client_id: c.id,
            exercise_id: ex.get(it.exercise) ?? null,
            name: ex.has(it.exercise) ? null : it.exercise,
            sort_order: ii,
            // Semana de descarga: menos carga
            prescription: (w === 3 && typeof it.p.load_kg === "number"
              ? { ...it.p, load_kg: Math.round((it.p.load_kg as number) * 0.8) }
              : it.p) as NonNullable<Json>,
          }));
          const created = await must(
            db.from("session_items").insert(items).select("id, exercise_id, prescription"),
            "ítems",
          );

          // Entrenos ya hechos: semanas 0 y 1 (con progresión)
          if (w < 2) {
            const date = addDays(start, w * 7 + s.day);
            if (date > today) continue;
            const logId = crypto.randomUUID();
            await must(
              db
                .from("workout_logs")
                .insert({
                  id: logId,
                  client_id: c.id,
                  session_id: session!.id,
                  title: s.title,
                  started_at: new Date(date.getTime() + 18 * 3600_000).toISOString(),
                  completed_at: new Date(date.getTime() + 19 * 3600_000).toISOString(),
                  total_time_s: 3300 + w * 120,
                  session_rpe: 7 + w,
                  feeling: 4,
                })
                .select("id"),
              "log",
            );
            const sets = created.flatMap((it) => {
              const pr = it.prescription as Record<string, number | string>;
              const n = Number(pr.repeat ?? pr.sets ?? 1);
              return Array.from({ length: n }, (_, i) => ({
                id: crypto.randomUUID(),
                workout_log_id: logId,
                client_id: c.id,
                session_item_id: it.id,
                exercise_id: it.exercise_id,
                set_index: i,
                reps: typeof pr.reps === "string" ? Number.parseInt(pr.reps, 10) || null : null,
                load_kg: typeof pr.load_kg === "number" ? pr.load_kg + w * 2.5 : null,
                distance_m: typeof pr.distance_m === "number" ? pr.distance_m : null,
                duration_s:
                  typeof pr.distance_m === "number" && typeof pr.pace_min_s === "number"
                    ? Math.round((pr.distance_m / 1000) * (pr.pace_max_s as number)) - w * 5
                    : null,
                station_key: typeof pr.station_key === "string" ? pr.station_key : null,
              }));
            });
            if (sets.length) await must(db.from("set_logs").insert(sets).select("id"), "series");
          }
        }
      }
    }
    await db
      .from("clients")
      .update({ last_activity_at: new Date(addDays(start, 7 + 4).getTime() + 19 * 3600_000).toISOString() })
      .eq("id", c.id);
    console.log(`  ✓ plan de ${c.profiles?.full_name}`);
  }
}

// ───────────────────────────── Fase 3: seguimiento ─────────────────────────────

async function seedTracking() {
  const { count } = await db.from("client_metrics").select("client_id", { count: "exact", head: true });
  if (count) return console.log("Fase 3 ya cargada.");
  console.log("→ Seguimiento");
  const { data: defs } = await db.from("metric_definitions").select("id, key");
  const def = (k: string) => defs!.find((d) => d.key === k)!.id;
  const { data: tpl } = await db.from("checkin_templates").select("id, questions").eq("is_default", true).single();
  const { data: staff } = await db.from("profiles").select("id").eq("role", "owner").single();
  const { data: clients } = await db
    .from("clients")
    .select("id, modalities, profiles(full_name)")
    .not("onboarding_completed_at", "is", null);
  const today = new Date();

  for (const [ci, c] of (clients ?? []).entries()) {
    const running = c.modalities.includes("running");
    const metrics = [
      { key: "weight", target: running ? null : 75 - ci, dir: "down", freq: "weekly" },
      { key: "waist", target: 80, dir: "down", freq: "monthly" },
      {
        key: running ? "steps" : "energy",
        target: running ? 10000 : null,
        dir: running ? "up" : null,
        freq: running ? "daily" : "weekly",
      },
      { key: "plan_adherence", target: null, dir: null, freq: "weekly" },
    ];
    await must(
      db
        .from("client_metrics")
        .insert(
          metrics.map((m) => ({
            client_id: c.id,
            metric_id: def(m.key),
            frequency: m.freq,
            target_value: m.target,
            target_direction: m.dir,
          })),
        )
        .select("metric_id"),
      "métricas",
    );
    // 6 semanas de registros con una tendencia creíble (datos ficticios)
    const entries = [];
    for (let w = 6; w >= 0; w--) {
      const d = iso(addDays(today, -w * 7));
      entries.push({
        client_id: c.id,
        metric_id: def("weight"),
        recorded_on: d,
        value_num: Math.round((79 - ci - (6 - w) * 0.35) * 10) / 10,
      });
      if (w % 3 === 0)
        entries.push({ client_id: c.id, metric_id: def("waist"), recorded_on: d, value_num: 88 - (6 - w) * 0.5 });
      entries.push({
        client_id: c.id,
        metric_id: def(running ? "steps" : "energy"),
        recorded_on: d,
        value_num: running ? 7000 + (6 - w) * 450 : 6 + ((w + ci) % 3),
      });
      entries.push({
        client_id: c.id,
        metric_id: def("plan_adherence"),
        recorded_on: d,
        value_num: 7 + ((w + ci) % 3),
      });
    }
    await must(db.from("metric_entries").insert(entries).select("id"), "registros");

    // Check-ins: uno revisado, uno enviado (por revisar) y, para algunos, uno pendiente
    const qs = tpl!.questions as { key: string; label: string }[];
    const make = async (daysAgo: number, status: "reviewed" | "submitted" | "pending") => {
      const [ch] = await must(
        db
          .from("checkins")
          .insert({
            client_id: c.id,
            template_id: tpl!.id,
            due_on: iso(addDays(today, -daysAgo)),
            status,
            submitted_at: status === "pending" ? null : addDays(today, -daysAgo + 1).toISOString(),
            reviewed_at: status === "reviewed" ? addDays(today, -daysAgo + 2).toISOString() : null,
            reviewed_by: status === "reviewed" ? staff!.id : null,
            staff_reply:
              status === "reviewed"
                ? "Buena semana. Subimos un poco la carga en sentadilla y mantenemos el resto. Sigue así."
                : null,
          })
          .select("id"),
        "check-in",
      );
      if (status !== "pending") {
        const vals: Record<string, unknown> = {
          week: 7 + (ci % 3),
          workouts: 3,
          food: 7,
          pain: false,
          notes: "Semana de exámenes, he dormido poco (dato de demo).",
        };
        await must(
          db
            .from("checkin_answers")
            .insert(
              qs.map((q) => ({
                checkin_id: ch!.id,
                client_id: c.id,
                question_key: q.key,
                question_label: q.label,
                value: (vals[q.key] ?? null) as never,
              })),
            )
            .select("checkin_id"),
          "respuestas",
        );
      }
    };
    await make(14, "reviewed");
    await make(7, "submitted");
    if (ci % 2 === 0) await make(0, "pending");
    console.log(`  ✓ seguimiento de ${c.profiles?.full_name}`);
  }

  const [field] = await must(
    db
      .from("custom_fields")
      .insert({ key: "talla_zapatilla", label: "Talla de zapatilla", type: "number", client_editable: true })
      .select("id"),
    "campo",
  );
  await db.from("custom_fields").insert({
    key: "objetivo_carrera",
    label: "Carrera objetivo",
    type: "select",
    options: ["10K", "Media maratón", "Maratón", "HYROX"],
    client_editable: false,
  });
  for (const c of clients ?? [])
    await db.from("custom_field_values").insert({ client_id: c.id, field_id: field!.id, value: null });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
