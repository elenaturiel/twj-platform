import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth/dal";
import { todayInMadrid } from "@/lib/dates";
import { addDays } from "@/domain/billing/renewal";
import { DAY_NAMES, mondayOf } from "@/domain/training/week";
import { getClientPlanForWeek, getFoods } from "@/features/nutrition/queries";
import { MenuEditor } from "@/features/nutrition/ui/menu-editor";
import { ChangeRequestReply, NewWeekMenu } from "@/features/nutrition/ui/staff-panels";
import { DayNotes, type DayNote } from "@/features/nutrition/ui/day-notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/features/clients/ui";

export default async function ClientNutrition({ params, searchParams }: PageProps<"/panel/clientes/[id]/nutricion">) {
  const viewer = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const week =
    typeof sp.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana)
      ? mondayOf(sp.semana)
      : mondayOf(todayInMadrid());
  const supabase = await createClient();
  const [plan, foods, { data: intake }, { data: templates }, { data: prev }, { data: requests }, { data: notes }] =
    await Promise.all([
      getClientPlanForWeek(id, week),
      getFoods(),
      supabase
        .from("client_intake")
        .select("allergens, allergy_notes, food_budget_cents, food_budget_period")
        .eq("client_id", id)
        .maybeSingle(),
      supabase.from("meal_plans").select("id, meal_templates!inner(name)").not("template_id", "is", null),
      supabase
        .from("meal_plans")
        .select("id")
        .eq("client_id", id)
        .lt("week_start", week)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("meal_change_requests")
        .select("id, day_index, reason, status, response, created_at, meals(slot, title)")
        .eq("client_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("day_notes")
        .select("id, date, body, author_id, created_at, profiles(full_name)")
        .eq("client_id", id)
        .gte("date", week)
        .lte("date", addDays(week, 6))
        .order("created_at"),
    ]);
  const base = `/panel/clientes/${id}/nutricion`;
  const notesByDate = (d: string): DayNote[] =>
    (notes ?? [])
      .filter((n) => n.date === d)
      .map((n) => ({
        id: n.id,
        body: n.body,
        author_id: n.author_id,
        created_at: n.created_at,
        author_name: n.profiles?.full_name ?? null,
      }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`${base}?semana=${addDays(week, -7)}`}>← Semana anterior</Link>
        </Button>
        <p className="font-semibold">Semana del {formatDate(week)}</p>
        <Button asChild size="sm" variant="outline">
          <Link href={`${base}?semana=${addDays(week, 7)}`}>Semana siguiente →</Link>
        </Button>
        {intake?.food_budget_cents ? (
          <Badge variant="secondary" className="ml-auto">
            Presupuesto: {(intake.food_budget_cents / 100).toFixed(0)} €/
            {intake.food_budget_period === "week" ? "semana" : "mes"}
          </Badge>
        ) : null}
      </div>
      {intake?.allergy_notes ? (
        <p className="text-xs text-muted-foreground">Notas de alergias: {intake.allergy_notes}</p>
      ) : null}

      {plan ? (
        <MenuEditor
          plan={plan}
          foods={foods}
          clientAllergens={intake?.allergens ?? []}
          backHref={base}
          nextWeekStart={addDays(week, 7)}
        />
      ) : (
        <NewWeekMenu
          clientId={id}
          weekStart={week}
          previousPlanId={prev?.id ?? null}
          templates={(templates ?? []).map((t) => ({ planId: t.id, name: t.meal_templates.name }))}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solicitudes de cambio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(requests ?? []).map((r) => (
              <div key={r.id} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {r.day_index != null ? DAY_NAMES[r.day_index] : ""}
                    {r.meals ? ` · ${r.meals.title ?? r.meals.slot}` : ""}
                  </span>
                  <Badge variant={r.status === "open" ? "default" : "outline"}>
                    {r.status === "open" ? "Pendiente" : r.status === "resolved" ? "Cambiado" : "Respondido"}
                  </Badge>
                </div>
                <p>«{r.reason}»</p>
                {r.response ? <p className="text-muted-foreground">Respuesta: {r.response}</p> : null}
                {r.status === "open" ? (
                  <ChangeRequestReply requestId={r.id} />
                ) : (
                  <p className="text-xs text-muted-foreground">{formatDate(r.created_at, true)}</p>
                )}
              </div>
            ))}
            {!requests?.length ? <p className="text-muted-foreground">Sin solicitudes.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas de la semana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((d, i) => (
              <div key={d} className="space-y-1">
                <p className="text-xs font-semibold">{DAY_NAMES[i]}</p>
                <DayNotes notes={notesByDate(d)} date={d} clientId={id} viewerId={viewer.id} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
