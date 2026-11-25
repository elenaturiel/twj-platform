import type { Metadata } from "next";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requireScope } from "@/lib/auth/dal";
import { todayInMadrid } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/domain/billing/renewal";
import { DAY_NAMES, mondayOf } from "@/domain/training/week";
import { getAppointmentTypes, getStaffWeek } from "@/features/agenda/queries";
import { NewAppointment, WeekBoard } from "@/features/agenda/ui/staff-agenda";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Agenda" };

export default async function StaffAgendaPage({ searchParams }: PageProps<"/panel/agenda">) {
  await requireScope("clients");
  const sp = await searchParams;
  const today = todayInMadrid();
  const monday =
    typeof sp.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? mondayOf(sp.semana) : mondayOf(today);
  const supabase = await createClient();
  const [appointments, types, { data: clients }] = await Promise.all([
    getStaffWeek(monday),
    getAppointmentTypes(),
    supabase.from("clients").select("id, profiles(full_name)").in("status", ["active", "past_due"]).order("created_at"),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    return { date, label: `${DAY_NAMES[i]} ${Number(date.slice(8))}` };
  });
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold">Agenda</h1>
        <div className="flex gap-2">
          <NewAppointment
            clients={(clients ?? [])
              .map((c) => ({ id: c.id, name: c.profiles?.full_name ?? "Cliente" }))
              .sort((a, b) => a.name.localeCompare(b.name))}
            types={types.filter((t) => t.is_active).map((t) => ({ key: t.key, name: t.name }))}
          />
          <Button asChild size="sm" variant="outline">
            <Link href="/panel/agenda/disponibilidad">
              <Settings2 className="size-4" /> Disponibilidad
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button asChild size="sm" variant="outline">
          <Link href={`/panel/agenda?semana=${addDays(monday, -7)}`}>← Anterior</Link>
        </Button>
        <span className="font-semibold">
          {fmt(monday)} – {fmt(addDays(monday, 6))}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href={`/panel/agenda?semana=${addDays(monday, 7)}`}>Siguiente →</Link>
        </Button>
        {monday !== mondayOf(today) ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/panel/agenda">Hoy</Link>
          </Button>
        ) : null}
        <span className="ml-auto text-muted-foreground">{confirmed} citas confirmadas</span>
      </div>
      <WeekBoard days={days} appointments={appointments} today={today} />
    </div>
  );
}
