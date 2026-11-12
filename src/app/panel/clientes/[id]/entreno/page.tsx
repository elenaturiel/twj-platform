import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { todayInMadrid } from "@/lib/dates";
import { addDays } from "@/domain/billing/renewal";
import { weekdayMondayFirst } from "@/domain/training/week";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignTemplateForm, CreateBlockForm } from "@/features/training/ui/block-forms";
import { LOG_SELECT, LogsList, type LogWithSets } from "@/features/training/ui/logs-list";
import { formatDate } from "@/features/clients/ui";

const STATUS = { draft: "Borrador", active: "Publicado", done: "Terminado" } as const;

export default async function ClientTraining({ params }: PageProps<"/panel/clientes/[id]/entreno">) {
  const { id } = await params;
  const supabase = await createClient();
  const today = todayInMadrid();
  const nextMonday = addDays(today, (7 - weekdayMondayFirst(today)) % 7 || 7);

  const [{ data: blocks }, { data: templates }, { data: logs }, { data: prs }] = await Promise.all([
    supabase
      .from("workout_blocks")
      .select("id, name, goal, starts_on, status, workout_weeks(id)")
      .eq("client_id", id)
      .order("starts_on", { ascending: false, nullsFirst: true }),
    supabase.from("workout_blocks").select("id, workout_templates!inner(name)").not("template_id", "is", null),
    supabase
      .from("workout_logs")
      .select(LOG_SELECT)
      .eq("client_id", id)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("personal_records")
      .select("id, record_type, record_key, value, unit, achieved_at, exercises(name)")
      .eq("client_id", id)
      .order("achieved_at", { ascending: false })
      .limit(10),
  ]);
  const base = `/panel/clientes/${id}/entreno`;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bloques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {blocks?.length ? (
              <ul className="divide-y rounded-lg border">
                {blocks.map((b) => (
                  <li key={b.id}>
                    <Link href={`${base}/${b.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                      <span className="flex-1">
                        <span className="font-medium">{b.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {b.goal ? `${b.goal} · ` : ""}
                          {b.workout_weeks.length} semanas · desde {formatDate(b.starts_on)}
                        </span>
                      </span>
                      <Badge variant={b.status === "active" ? "default" : "outline"}>
                        {STATUS[b.status as keyof typeof STATUS]}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todavía no tiene plan. Crea un bloque o asigna una plantilla.
              </p>
            )}
            <CreateBlockForm clientId={id} templateId={null} baseHref={base} defaultStart={nextMonday} />
            <AssignTemplateForm
              clientId={id}
              baseHref={base}
              defaultStart={nextMonday}
              templates={(templates ?? []).map((t) => ({ blockId: t.id, name: t.workout_templates.name }))}
            />
            <p className="text-xs text-muted-foreground">
              ¿Rutinas en Excel?{" "}
              <Link href={`/panel/importar?cliente=${id}`} className="underline">
                Importarlas
              </Link>
              .
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos entrenos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <LogsList logs={(logs ?? []) as unknown as LogWithSets[]} />
          </CardContent>
        </Card>
      </div>
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">Récords recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {(prs ?? []).map((r) => (
              <li key={r.id} className="py-2">
                <p className="font-medium">
                  {r.exercises?.name ??
                    (r.record_type === "best_time" ? `${Number(r.record_key) / 1000} km` : r.record_key)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.record_type} · {Number(r.value).toLocaleString("es-ES")} {r.unit} · {formatDate(r.achieved_at)}
                </p>
              </li>
            ))}
            {!prs?.length ? <li className="py-2 text-muted-foreground">Sin récords todavía.</li> : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
