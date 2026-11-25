"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  FORMATS,
  FORMATS_BY_MODALITY,
  MODALITIES,
  MODALITY_LABELS,
  summarizePart,
  summarizePrescription,
  type Format,
  type Modality,
  type PartParams,
  type Prescription,
} from "@/domain/training/prescription";
import { DAY_NAMES, sessionDate } from "@/domain/training/week";
import { formatDuration, parseDuration } from "@/domain/training/time";
import type { BlockNode, ItemNode, PartNode, SessionNode, WeekNode } from "../queries";
import {
  addWeek,
  copyBlockTo,
  copyWeek,
  deleteBlock,
  deleteItem,
  deletePart,
  deleteSession,
  deleteWeek,
  moveItem,
  saveItem,
  savePart,
  saveSession,
  updateBlock,
  updateWeek,
  type TrainingResult,
} from "../staff-actions";
import { ExercisePicker, type PickerExercise } from "./exercise-picker";
import { PrescriptionFields } from "./prescription-fields";

type DialogState =
  | { type: "session"; weekId: string; session?: SessionNode }
  | { type: "part"; sessionId: string; part?: PartNode }
  | { type: "item"; part: PartNode; item?: ItemNode }
  | { type: "template" }
  | null;

const STATUS_LABEL = { draft: "Borrador (el cliente no lo ve)", active: "Publicado", done: "Terminado" };

export function BlockEditor({
  block,
  exercises,
  stations,
  backHref,
}: {
  block: BlockNode;
  exercises: PickerExercise[];
  stations: { key: string; name: string }[];
  backHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialog, setDialog] = useState<DialogState>(null);
  const isTemplate = !block.client_id;

  const run = (fn: () => Promise<TrainingResult>, ok = "Guardado", after?: (r: TrainingResult) => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(ok);
        setDialog(null);
        after?.(r);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="space-y-6">
      <BlockHeader
        block={block}
        pending={pending}
        run={run}
        onTemplate={() => setDialog({ type: "template" })}
        backHref={backHref}
      />

      <div className="space-y-4">
        {block.workout_weeks.map((week) => (
          <WeekCard key={week.id} week={week} block={block} pending={pending} run={run} setDialog={setDialog} />
        ))}
        <Button variant="outline" onClick={() => run(() => addWeek(block.id), "Semana añadida")} disabled={pending}>
          <Plus className="size-4" /> Añadir semana
        </Button>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {dialog?.type === "session" ? <SessionForm state={dialog} pending={pending} run={run} /> : null}
          {dialog?.type === "part" ? <PartForm state={dialog} pending={pending} run={run} /> : null}
          {dialog?.type === "item" ? (
            <ItemForm state={dialog} exercises={exercises} stations={stations} pending={pending} run={run} />
          ) : null}
          {dialog?.type === "template" ? (
            <TemplateForm
              defaultName={block.name}
              pending={pending}
              onSubmit={(name) =>
                run(() => copyBlockTo({ blockId: block.id, asTemplate: { name } }), "Guardado como plantilla")
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
      {isTemplate ? null : null}
    </div>
  );
}

type Run = (fn: () => Promise<TrainingResult>, ok?: string, after?: (r: TrainingResult) => void) => void;

function BlockHeader({
  block,
  pending,
  run,
  onTemplate,
  backHref,
}: {
  block: BlockNode;
  pending: boolean;
  run: Run;
  onTemplate: () => void;
  backHref: string;
}) {
  const router = useRouter();
  const isTemplate = !block.client_id;
  return (
    <form
      className="space-y-3 rounded-xl border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() =>
          updateBlock({
            blockId: block.id,
            name: String(f.get("name")),
            goal: String(f.get("goal") ?? ""),
            startsOn: isTemplate ? undefined : String(f.get("startsOn") ?? "") || null,
          }),
        );
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isTemplate ? (
          <Badge variant="secondary">Plantilla</Badge>
        ) : (
          <Badge variant={block.status === "active" ? "default" : "outline"}>{STATUS_LABEL[block.status]}</Badge>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr]">
        <div className="space-y-1">
          <Label htmlFor="name">Nombre del bloque</Label>
          <Input id="name" name="name" defaultValue={block.name} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="goal">Objetivo</Label>
          <Input id="goal" name="goal" defaultValue={block.goal ?? ""} placeholder="Fuerza base, preparar 10K…" />
        </div>
        {!isTemplate ? (
          <div className="space-y-1">
            <Label htmlFor="startsOn">Empieza (lunes)</Label>
            <Input id="startsOn" name="startsOn" type="date" defaultValue={block.starts_on ?? ""} />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Guardar
        </Button>
        {!isTemplate && block.status !== "active" ? (
          <Button
            type="button"
            size="sm"
            disabled={pending || !block.starts_on}
            title={!block.starts_on ? "Pon la fecha de inicio para publicar" : undefined}
            onClick={() =>
              run(() => updateBlock({ blockId: block.id, status: "active" }), "Publicado: el cliente ya lo ve")
            }
          >
            Publicar al cliente
          </Button>
        ) : null}
        {!isTemplate && block.status === "active" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => updateBlock({ blockId: block.id, status: "done" }), "Bloque terminado")}
          >
            Marcar como terminado
          </Button>
        ) : null}
        {!isTemplate ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => copyBlockTo({ blockId: block.id, toClientId: block.client_id, startsOn: null }),
                "Bloque duplicado (borrador)",
                (r) => r.ok && r.id && router.push(`${backHref}/${r.id}`),
              )
            }
          >
            <Copy className="size-4" /> Duplicar
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onTemplate}>
          Guardar como plantilla
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-destructive"
          disabled={pending}
          onClick={() =>
            confirm("¿Borrar el bloque entero? Los entrenos ya registrados se conservan.") &&
            run(
              () => deleteBlock(block.id),
              "Bloque borrado",
              () => router.push(backHref),
            )
          }
        >
          <Trash2 className="size-4" /> Borrar
        </Button>
      </div>
    </form>
  );
}

function WeekCard({
  week,
  block,
  pending,
  run,
  setDialog,
}: {
  week: WeekNode;
  block: BlockNode;
  pending: boolean;
  run: Run;
  setDialog: (d: DialogState) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border p-4" aria-label={`Semana ${week.week_index + 1}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">Semana {week.week_index + 1}</h3>
        {week.is_deload ? <Badge variant="secondary">Descarga</Badge> : null}
        <div className="ml-auto flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setDialog({ type: "session", weekId: week.id })}
          >
            <Plus className="size-4" /> Sesión
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => copyWeek(week.id, false), "Semana duplicada")}
          >
            <Copy className="size-4" /> Duplicar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => copyWeek(week.id, true), "Semana de descarga añadida")}
          >
            + Descarga
          </Button>
          <Label className="flex items-center gap-1.5 px-2 text-xs font-normal">
            <Switch
              checked={week.is_deload}
              disabled={pending}
              onCheckedChange={(v) => run(() => updateWeek(week.id, { is_deload: v }))}
              aria-label="Semana de descarga"
            />
            Descarga
          </Label>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Borrar semana"
            disabled={pending}
            onClick={() =>
              confirm("¿Borrar esta semana y sus sesiones?") && run(() => deleteWeek(week.id), "Semana borrada")
            }
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {week.workout_sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin sesiones todavía.</p>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {week.workout_sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            week={week}
            block={block}
            pending={pending}
            run={run}
            setDialog={setDialog}
          />
        ))}
      </div>
    </section>
  );
}

function SessionCard({
  session,
  week,
  block,
  pending,
  run,
  setDialog,
}: {
  session: SessionNode;
  week: WeekNode;
  block: BlockNode;
  pending: boolean;
  run: Run;
  setDialog: (d: DialogState) => void;
}) {
  const date = sessionDate(block.starts_on, week.week_index, session.day_index);
  return (
    <article className="space-y-3 rounded-lg border bg-card p-3">
      <header className="flex items-start gap-2">
        <div className="flex-1">
          <p className="font-semibold">{session.title}</p>
          <p className="text-xs text-muted-foreground">
            {session.day_index != null ? DAY_NAMES[session.day_index] : "Día libre"}
            {date
              ? ` · ${new Date(`${date}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
              : ""}
            {!session.published ? " · oculta" : ""}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Editar sesión"
          onClick={() => setDialog({ type: "session", weekId: week.id, session })}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Borrar sesión"
          disabled={pending}
          onClick={() =>
            confirm(`¿Borrar «${session.title}»?`) && run(() => deleteSession(session.id), "Sesión borrada")
          }
        >
          <Trash2 className="size-4" />
        </Button>
      </header>
      {session.session_parts.map((p) => (
        <div key={p.id} className="space-y-2 rounded-md bg-muted/40 p-2">
          <div className="flex items-center gap-1">
            <p className="flex-1 text-sm font-medium">
              <Badge variant="outline" className="mr-1.5">
                {MODALITY_LABELS[p.modality]}
              </Badge>
              {p.title ? `${p.title} · ` : ""}
              {summarizePart(p.format, p.params)}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Editar bloque"
              onClick={() => setDialog({ type: "part", sessionId: session.id, part: p })}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Borrar bloque"
              disabled={pending}
              onClick={() => confirm("¿Borrar este bloque de la sesión?") && run(() => deletePart(p.id), "Borrado")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <ol className="space-y-1">
            {p.session_items.map((it, idx) => (
              <li key={it.id} className="flex items-center gap-1 rounded bg-background px-2 py-1 text-sm">
                <span className="flex-1">
                  {it.superset_group ? <span className="mr-1 font-bold text-accent">{it.superset_group}</span> : null}
                  <span className="font-medium">{it.exercises?.name ?? it.name}</span>
                  <span className="block text-xs text-muted-foreground">{summarizePrescription(it.prescription)}</span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="Subir"
                  disabled={pending || idx === 0}
                  onClick={() => run(() => moveItem(it.id, -1), "Movido")}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="Bajar"
                  disabled={pending || idx === p.session_items.length - 1}
                  onClick={() => run(() => moveItem(it.id, 1), "Movido")}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="Editar ejercicio"
                  onClick={() => setDialog({ type: "item", part: p, item: it })}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label="Quitar ejercicio"
                  disabled={pending}
                  onClick={() => run(() => deleteItem(it.id), "Quitado")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ol>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setDialog({ type: "item", part: p })}>
            <Plus className="size-3.5" /> Ejercicio
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => setDialog({ type: "part", sessionId: session.id })}
      >
        <Plus className="size-4" /> Bloque (gym, funcional, running, HYROX)
      </Button>
    </article>
  );
}

function SessionForm({
  state,
  pending,
  run,
}: {
  state: Extract<DialogState, { type: "session" }>;
  pending: boolean;
  run: Run;
}) {
  const s = state.session;
  const [published, setPublished] = useState(s?.published ?? true);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const day = String(f.get("day") ?? "");
        run(() =>
          saveSession({
            id: s?.id,
            weekId: state.weekId,
            title: String(f.get("title")),
            dayIndex: day === "" ? null : Number(day),
            notes: String(f.get("notes") ?? ""),
            published,
          }),
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>{s ? "Editar sesión" : "Nueva sesión"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-1">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" defaultValue={s?.title ?? ""} placeholder="Pierna, Rodaje, WOD…" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="day">Día</Label>
        <select
          id="day"
          name="day"
          defaultValue={s?.day_index ?? ""}
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Libre (cuando pueda)</option>
          {DAY_NAMES.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notas para el cliente</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={s?.notes ?? ""} />
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Switch checked={published} onCheckedChange={setPublished} /> Visible para el cliente
      </Label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function PartForm({
  state,
  pending,
  run,
}: {
  state: Extract<DialogState, { type: "part" }>;
  pending: boolean;
  run: Run;
}) {
  const p = state.part;
  const [modality, setModality] = useState<Modality>(p?.modality ?? "gym");
  const [format, setFormat] = useState<Format>(p?.format ?? FORMATS_BY_MODALITY[p?.modality ?? "gym"][0]!);
  const [params, setParams] = useState<PartParams>(p?.params ?? {});
  const setParam = (k: keyof PartParams, raw: string, duration = false) =>
    setParams((cur) => ({
      ...cur,
      [k]: raw.trim() === "" ? undefined : duration ? (parseDuration(raw) ?? undefined) : Number(raw.replace(",", ".")),
    }));
  const showRounds = ["rounds", "circuit", "for_time", "tabata", "superset"].includes(format);
  const showMinutes = ["amrap", "emom"].includes(format);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() =>
          savePart({
            id: p?.id,
            session_id: state.sessionId,
            title: String(f.get("title") ?? "") || null,
            modality,
            format,
            params: {
              ...params,
              scaling: String(f.get("scaling") ?? "") || undefined,
              category: String(f.get("category") ?? "") || undefined,
            },
            notes: String(f.get("notes") ?? "") || null,
          }),
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>{p ? "Editar bloque de la sesión" : "Nuevo bloque de la sesión"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Modalidad</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={modality}
            onChange={(e) => {
              const m = e.target.value as Modality;
              setModality(m);
              setFormat(FORMATS_BY_MODALITY[m][0]!);
            }}
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {MODALITY_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Formato</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
          >
            {FORMATS_BY_MODALITY[modality].map((f) => (
              <option key={f} value={f}>
                {FORMATS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ptitle">Título (opcional)</Label>
        <Input
          id="ptitle"
          name="title"
          defaultValue={p?.title ?? ""}
          placeholder="Calentamiento, Bloque A, Finisher…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {showRounds ? (
          <div className="space-y-1">
            <Label className="text-xs">Rondas</Label>
            <Input
              inputMode="numeric"
              defaultValue={params.rounds ?? ""}
              onBlur={(e) => setParam("rounds", e.target.value)}
            />
          </div>
        ) : null}
        {showMinutes ? (
          <div className="space-y-1">
            <Label className="text-xs">Minutos totales</Label>
            <Input
              inputMode="numeric"
              defaultValue={params.minutes ?? ""}
              onBlur={(e) => setParam("minutes", e.target.value)}
            />
          </div>
        ) : null}
        {format === "emom" ? (
          <div className="space-y-1">
            <Label className="text-xs">Cada (m:ss)</Label>
            <Input
              defaultValue={params.every_s ? formatDuration(params.every_s) : ""}
              onBlur={(e) => setParam("every_s", e.target.value, true)}
            />
          </div>
        ) : null}
        {format === "tabata" ? (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Trabajo (s)</Label>
              <Input
                inputMode="numeric"
                defaultValue={params.work_s ?? ""}
                onBlur={(e) => setParam("work_s", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descanso (s)</Label>
              <Input
                inputMode="numeric"
                defaultValue={params.rest_s ?? ""}
                onBlur={(e) => setParam("rest_s", e.target.value)}
              />
            </div>
          </>
        ) : null}
        {["amrap", "for_time", "hyrox_sim"].includes(format) ? (
          <div className="space-y-1">
            <Label className="text-xs">Time cap (m:ss)</Label>
            <Input
              defaultValue={params.time_cap_s ? formatDuration(params.time_cap_s) : ""}
              onBlur={(e) => setParam("time_cap_s", e.target.value, true)}
            />
          </div>
        ) : null}
      </div>
      {modality === "functional" ? (
        <div className="space-y-1">
          <Label className="text-xs">Escalado</Label>
          <Input
            name="scaling"
            defaultValue={params.scaling ?? ""}
            placeholder="Kettlebell 12 kg, step-ups en vez de box jumps…"
          />
        </div>
      ) : null}
      {modality === "hyrox" ? (
        <div className="space-y-1">
          <Label className="text-xs">Categoría</Label>
          <Input name="category" defaultValue={params.category ?? ""} placeholder="Open, Pro, Dobles…" />
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="pnotes">Notas</Label>
        <Textarea id="pnotes" name="notes" rows={2} defaultValue={p?.notes ?? ""} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function ItemForm({
  state,
  exercises,
  stations,
  pending,
  run,
}: {
  state: Extract<DialogState, { type: "item" }>;
  exercises: PickerExercise[];
  stations: { key: string; name: string }[];
  pending: boolean;
  run: Run;
}) {
  const it = state.item;
  const [sel, setSel] = useState({ exerciseId: it?.exercise_id ?? null, name: it?.name ?? "" });
  const [prescription, setPrescription] = useState<Prescription>(it?.prescription ?? {});
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() =>
          saveItem({
            id: it?.id,
            part_id: state.part.id,
            exercise_id: sel.exerciseId,
            name: sel.exerciseId ? null : sel.name || null,
            superset_group: String(f.get("superset") ?? "") || null,
            prescription,
            notes: String(f.get("notes") ?? "") || null,
          }),
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>{it ? "Editar ejercicio" : "Añadir ejercicio"}</DialogTitle>
      </DialogHeader>
      <ExercisePicker
        exercises={exercises}
        modality={state.part.modality}
        selectedId={sel.exerciseId}
        freeName={sel.name}
        onSelect={setSel}
      />
      <PrescriptionFields
        modality={state.part.modality}
        value={prescription}
        onChange={setPrescription}
        stations={stations}
      />
      {state.part.format === "superset" || state.part.format === "straight" ? (
        <div className="w-32 space-y-1">
          <Label htmlFor="superset" className="text-xs">
            Superserie (A, B…)
          </Label>
          <Input id="superset" name="superset" maxLength={5} defaultValue={it?.superset_group ?? ""} />
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="inotes">Notas técnicas</Label>
        <Textarea id="inotes" name="notes" rows={2} defaultValue={it?.notes ?? ""} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function TemplateForm({
  defaultName,
  pending,
  onSubmit,
}: {
  defaultName: string;
  pending: boolean;
  onSubmit: (name: string) => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(String(new FormData(e.currentTarget).get("name")));
      }}
    >
      <DialogHeader>
        <DialogTitle>Guardar como plantilla</DialogTitle>
      </DialogHeader>
      <div className="space-y-1">
        <Label htmlFor="tname">Nombre de la plantilla</Label>
        <Input id="tname" name="name" defaultValue={defaultName} required />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar plantilla
        </Button>
      </DialogFooter>
    </form>
  );
}
