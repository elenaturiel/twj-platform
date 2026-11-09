import "server-only";
import { createClient } from "@/lib/supabase/server";

export const NIVEL: Record<string, string> = {
  nunca: "Nunca ha hecho HYROX",
  gimnasio: "Entrena, sin competir",
  competido: "Ya ha competido",
};
export const CUANDO: Record<string, string> = {
  "3m": "Próximos 3 meses",
  "3-6m": "Entre 3 y 6 meses",
  "mas-adelante": "Más adelante",
  curioseando: "Curioseando",
};

/** Lo mismo que veía el panel de la web: embudo, contactos y origen. */
export async function getHyroxStats() {
  const supabase = await createClient();
  const [{ data: rows }, { data: events }, { data: clients }] = await Promise.all([
    supabase
      .from("waitlist_hyrox")
      .select("id, email, nivel, cuando, ubicacion, utm_source, status, source, created_at, updated_at, notes")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("banner_events")
      .select("event, ubicacion, utm_source, created_at")
      .eq("banner_key", "hyrox")
      .order("created_at", { ascending: false })
      .limit(20000),
    supabase.from("profiles").select("email").eq("role", "client"),
  ]);
  const all = rows ?? [];
  const ev = events ?? [];
  const clientEmails = new Set((clients ?? []).map((c) => String(c.email).toLowerCase()));
  const started = all.filter((r) => r.nivel || r.cuando || r.email);
  const withEmail = all.filter((r) => r.email && r.status !== "unsubscribed");
  const count = (name: string) => ev.filter((e) => e.event === name).length;

  const group = (key: "ubicacion" | "utm_source") => {
    const names = new Set([
      ...all.map((r) => r[key] ?? "(directo)"),
      ...ev.filter((e) => e.event === "vista").map((e) => e[key] ?? "(directo)"),
    ]);
    return [...names]
      .map((n) => ({
        nombre: n,
        visitas: ev.filter((e) => e.event === "vista" && (e[key] ?? "(directo)") === n).length,
        empezaron: started.filter((r) => (r[key] ?? "(directo)") === n).length,
        emails: withEmail.filter((r) => (r[key] ?? "(directo)") === n).length,
      }))
      .sort((a, b) => b.emails - a.emails || b.empezaron - a.empezaron);
  };
  const dist = (key: "nivel" | "cuando") => {
    const out: Record<string, number> = {};
    for (const r of started) if (r[key]) out[r[key]!] = (out[r[key]!] ?? 0) + 1;
    return out;
  };

  return {
    visitas: count("vista"),
    empezaron: started.length,
    emails: withEmail.length,
    pasos: {
      paso1: all.filter((r) => r.nivel).length,
      paso2: all.filter((r) => r.cuando).length,
      envio: withEmail.length,
    },
    eventos: { vista: count("vista"), paso1: count("paso1"), paso2: count("paso2"), envio: count("envio") },
    porUbicacion: group("ubicacion"),
    porSource: group("utm_source"),
    nivel: dist("nivel"),
    cuando: dist("cuando"),
    contactos: withEmail.map((r) => ({ ...r, isClient: clientEmails.has(String(r.email).toLowerCase()) })),
    ultimo: all[0]?.updated_at ?? null,
  };
}

export type HyroxStats = Awaited<ReturnType<typeof getHyroxStats>>;
