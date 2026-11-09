"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronDown, Pause, Play, Plus, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MODALITY_LABELS,
  plannedSets,
  summarizePart,
  summarizePrescription,
  type Modality,
} from "@/domain/training/prescription";
import { formatDuration, formatPace, paceSecondsPerKm, parseDuration } from "@/domain/training/time";
import type { PartNode } from "../queries";
import { saveWorkoutLog } from "../client-actions";
import { clearDraft, loadDraft, queueLog, saveDraft } from "./offline-outbox";
import { VideoEmbed } from "./video-embed";

type SetRow = {
  id: string;
  reps: string;
  load: string;
  rpe: string;
  time: string; // m:ss
  distance: string;
  done: boolean;
};
type Draft = { logId: string; startedAt: string; sets: Record<string, SetRow[]> };

export type PreviousSets = Record<
  string,
  { reps: number | null; load_kg: number | null; duration_s: number | null; distance_m: number | null }[]
>;

const uuid = () => crypto.randomUUID();
const emptyRow = (): SetRow => ({ id: uuid(), reps: "", load: "", rpe: "", time: "", distance: "", done: false });
const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};

function beep() {
  try {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {}
  navigator.vibrate?.([200, 100, 200]);
}

/** Pantalla de entreno: registro por serie, temporizadores, autoguardado y modo sin conexión. */
export function WorkoutPlayer({
  sessionId,
  title,
  notes,
  parts,
  previous,
}: {
  sessionId: string;
  title: string;
  notes: string | null;
  parts: PartNode[];
  previous: PreviousSets;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [rest, setRest] = useState<{ until: number; total: number } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [result, setResult] = useState<{
    records: { label: string; value: string }[];
    offline: boolean;
    elapsed: number;
    doneSets: number;
  } | null>(null);
  const loadedFor = useRef<string | null>(null);
  const [pending, start] = useTransition();

  // Cargar borrador o crear uno nuevo (una sola vez por sesión: un refresco de la
  // página tras guardar no debe reiniciar el entreno)
  useEffect(() => {
    if (loadedFor.current === sessionId) return;
    loadedFor.current = sessionId;
    void loadDraft<Draft>(sessionId).then((saved) => {
      if (saved) return setDraft(saved);
      const sets: Record<string, SetRow[]> = {};
      for (const p of parts)
        for (const it of p.session_items) sets[it.id] = Array.from({ length: plannedSets(it.prescription) }, emptyRow);
      setDraft({ logId: uuid(), startedAt: new Date().toISOString(), sets });
    });
  }, [sessionId, parts]);

  // Autoguardado local
  useEffect(() => {
    if (draft) void saveDraft(sessionId, draft);
  }, [draft, sessionId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  // Aviso al terminar el descanso
  const restLeft = rest ? Math.max(0, Math.ceil((rest.until - now) / 1000)) : 0;
  const beeped = useRef(false);
  useEffect(() => {
    if (rest && restLeft === 0 && !beeped.current) {
      beeped.current = true;
      beep();
      toast("¡A por la siguiente serie!");
      setRest(null);
    }
    if (rest && restLeft > 0) beeped.current = false;
  }, [rest, restLeft]);

  const update = useCallback((itemId: string, idx: number, patch: Partial<SetRow>) => {
    setDraft((d) =>
      d
        ? { ...d, sets: { ...d.sets, [itemId]: d.sets[itemId]!.map((r, i) => (i === idx ? { ...r, ...patch } : r)) } }
        : d,
    );
  }, []);
  const addRow = (itemId: string) =>
    setDraft((d) => (d ? { ...d, sets: { ...d.sets, [itemId]: [...(d.sets[itemId] ?? []), emptyRow()] } } : d));

  const totalSets = draft ? Object.values(draft.sets).flat().length : 0;
  const doneSets = draft
    ? Object.values(draft.sets)
        .flat()
        .filter((s) => s.done).length
    : 0;
  // `now` se refresca cada 500 ms: justo al cargar puede ser anterior a startedAt
  const elapsed = draft ? Math.max(0, Math.floor((now - new Date(draft.startedAt).getTime()) / 1000)) : 0;

  function finish(form: { rpe: number | null; feeling: number | null; comment: string }) {
    if (!draft) return;
    const sets = parts.flatMap((p) =>
      p.session_items.flatMap((it) =>
        (draft.sets[it.id] ?? []).map((r, i) => ({
          id: r.id,
          session_item_id: it.id,
          exercise_id: it.exercise_id,
          set_index: i,
          reps: num(r.reps) === null ? null : Math.round(num(r.reps)!),
          load_kg: num(r.load),
          rpe: num(r.rpe),
          duration_s: parseDuration(r.time),
          distance_m: num(r.distance) === null ? null : Math.round(num(r.distance)!),
          station_key: it.prescription.station_key ?? null,
          notes: null,
        })),
      ),
    );
    // Duración con el reloj real al guardar (no con el último tick del cronómetro)
    const totalTime = Math.max(0, Math.floor((Date.now() - new Date(draft.startedAt).getTime()) / 1000));
    const log = {
      id: draft.logId,
      session_id: sessionId,
      title,
      started_at: draft.startedAt,
      completed_at: new Date().toISOString(),
      total_time_s: totalTime,
      session_rpe: form.rpe,
      feeling: form.feeling,
      comment: form.comment.trim() || null,
      sets,
    };
    start(async () => {
      const goOffline = async () => {
        await queueLog(log);
        await clearDraft(sessionId);
        setFinishOpen(false);
        setResult({ records: [], offline: true, elapsed: totalTime, doneSets });
      };
      if (!navigator.onLine) return void (await goOffline());
      try {
        const res = await saveWorkoutLog(log);
        if (res.ok) {
          await clearDraft(sessionId);
          setFinishOpen(false);
          setResult({ records: res.records, offline: false, elapsed: totalTime, doneSets });
        } else if (res.retryable) {
          await goOffline();
        } else {
          toast.error(res.error);
        }
      } catch {
        await goOffline();
      }
    });
  }

  if (result) return <WorkoutSummary title={title} {...result} />;
  if (!draft) return <p className="py-10 text-center text-sm text-muted-foreground">Calentando…</p>;

  return (
    <div className="space-y-4 pb-28">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {notes ? <p className="text-sm whitespace-pre-line text-muted-foreground">{notes}</p> : null}
      </header>

      <div className="sticky top-14 z-20 -mx-4 flex items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur">
        <Timer className="size-4 text-accent" aria-hidden />
        <span className="font-mono text-lg tabular-nums" aria-label="Tiempo total">
          {formatDuration(elapsed)}
        </span>
        <span className="text-xs text-muted-foreground">
          {doneSets}/{totalSets} series
        </span>
        {rest ? (
          <button
            type="button"
            onClick={() => setRest(null)}
            className="ml-auto flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground"
            aria-live="polite"
          >
            Descanso {formatDuration(restLeft)} <X className="size-3.5" aria-label="Saltar descanso" />
          </button>
        ) : null}
      </div>

      {parts.map((p) => (
        <PartCard
          key={p.id}
          part={p}
          draft={draft}
          previous={previous}
          update={update}
          addRow={addRow}
          onSetDone={(restS) => restS && setRest({ until: Date.now() + restS * 1000, total: restS })}
        />
      ))}

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <Button className="w-full" size="lg" onClick={() => setFinishOpen(true)} disabled={pending}>
            Terminar entreno
          </Button>
        </div>
      </div>

      <FinishDialog open={finishOpen} onOpenChange={setFinishOpen} pending={pending} onFinish={finish} />
    </div>
  );
}

function PartCard({
  part,
  draft,
  previous,
  update,
  addRow,
  onSetDone,
}: {
  part: PartNode;
  draft: Draft;
  previous: PreviousSets;
  update: (itemId: string, idx: number, patch: Partial<SetRow>) => void;
  addRow: (itemId: string) => void;
  onSetDone: (restS?: number) => void;
}) {
  return (
    <section className="space-y-3 rounded-2xl border p-3" aria-label={part.title ?? MODALITY_LABELS[part.modality]}>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{MODALITY_LABELS[part.modality]}</Badge>
        <p className="text-sm font-semibold">
          {part.title ? `${part.title} · ` : ""}
          {summarizePart(part.format, part.params)}
        </p>
      </div>
      {part.notes ? <p className="text-xs whitespace-pre-line text-muted-foreground">{part.notes}</p> : null}
      {["amrap", "emom", "for_time", "tabata", "rounds", "hyrox_sim", "run"].includes(part.format) ? (
        <PartTimer part={part} />
      ) : null}
      {part.session_items.map((it) => (
        <ItemLogger
          key={it.id}
          item={it}
          modality={part.modality}
          rows={draft.sets[it.id] ?? []}
          previous={it.exercise_id ? previous[it.exercise_id] : undefined}
          update={(idx, patch) => update(it.id, idx, patch)}
          addRow={() => addRow(it.id)}
          onSetDone={() => onSetDone(it.prescription.rest_s)}
        />
      ))}
    </section>
  );
}

function ItemLogger({
  item,
  modality,
  rows,
  previous,
  update,
  addRow,
  onSetDone,
}: {
  item: PartNode["session_items"][number];
  modality: Modality;
  rows: SetRow[];
  previous?: PreviousSets[string];
  update: (idx: number, patch: Partial<SetRow>) => void;
  addRow: () => void;
  onSetDone: () => void;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const name = item.exercises?.name ?? item.name ?? "Ejercicio";
  const hasInfo = Boolean(item.exercises?.video_url || item.exercises?.instructions || item.notes);
  const isLoad = modality === "gym" || (modality === "functional" && item.prescription.load_kg != null);
  const isEndurance = modality === "running" || modality === "hyrox";
  const prevText = previous?.length
    ? previous
        .map((s) =>
          s.load_kg != null && s.reps != null
            ? `${s.reps}×${s.load_kg}`
            : s.duration_s
              ? formatDuration(s.duration_s)
              : s.reps != null
                ? `${s.reps}`
                : s.distance_m
                  ? `${s.distance_m}m`
                  : "",
        )
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="space-y-2 rounded-xl bg-muted/30 p-3">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => hasInfo && setShowInfo((v) => !v)}
        aria-expanded={showInfo}
      >
        <span className="flex-1">
          {item.superset_group ? <span className="mr-1 font-bold text-accent">{item.superset_group}</span> : null}
          <span className="font-semibold">{name}</span>
          <span className="block text-xs text-muted-foreground">{summarizePrescription(item.prescription)}</span>
          {prevText ? <span className="block text-[11px] text-muted-foreground">La última vez: {prevText}</span> : null}
        </span>
        {hasInfo ? (
          <ChevronDown
            className={cn("mt-1 size-4 transition-transform", showInfo && "rotate-180")}
            aria-label="Ver vídeo e instrucciones"
          />
        ) : null}
      </button>
      {showInfo ? (
        <div className="space-y-2 text-sm">
          <VideoEmbed url={item.exercises?.video_url} title={name} />
          {item.exercises?.instructions ? <p className="whitespace-pre-line">{item.exercises.instructions}</p> : null}
          {item.exercises?.common_mistakes ? (
            <p className="whitespace-pre-line text-muted-foreground">
              Errores comunes: {item.exercises.common_mistakes}
            </p>
          ) : null}
          {item.notes ? <p className="italic">Jaime: {item.notes}</p> : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        {rows.map((r, i) => {
          const pace = isEndurance ? paceSecondsPerKm(num(r.distance) ?? 0, parseDuration(r.time) ?? 0) : null;
          return (
            <div key={r.id} className={cn("flex items-center gap-1.5", r.done && "opacity-70")}>
              <span className="w-5 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              {isEndurance ? (
                <>
                  <Input
                    aria-label={`Distancia serie ${i + 1}`}
                    className="h-10 w-20"
                    inputMode="numeric"
                    placeholder={item.prescription.distance_m ? String(item.prescription.distance_m) : "m"}
                    value={r.distance}
                    onChange={(e) => update(i, { distance: e.target.value })}
                  />
                  <Input
                    aria-label={`Tiempo serie ${i + 1}`}
                    className="h-10 w-20"
                    inputMode="numeric"
                    placeholder="m:ss"
                    value={r.time}
                    onChange={(e) => update(i, { time: e.target.value })}
                  />
                  <span className="w-16 text-[11px] text-muted-foreground">{pace ? formatPace(pace) : ""}</span>
                </>
              ) : (
                <>
                  <Input
                    aria-label={`Reps serie ${i + 1}`}
                    className="h-10 w-16"
                    inputMode="numeric"
                    placeholder={item.prescription.reps ?? "reps"}
                    value={r.reps}
                    onChange={(e) => update(i, { reps: e.target.value })}
                  />
                  {isLoad ? (
                    <Input
                      aria-label={`Kg serie ${i + 1}`}
                      className="h-10 w-20"
                      inputMode="decimal"
                      placeholder={item.prescription.load_kg ? `${item.prescription.load_kg} kg` : "kg"}
                      value={r.load}
                      onChange={(e) => update(i, { load: e.target.value })}
                    />
                  ) : (
                    <Input
                      aria-label={`Tiempo serie ${i + 1}`}
                      className="h-10 w-20"
                      inputMode="numeric"
                      placeholder="m:ss"
                      value={r.time}
                      onChange={(e) => update(i, { time: e.target.value })}
                    />
                  )}
                  <Input
                    aria-label={`RPE serie ${i + 1}`}
                    className="h-10 w-14"
                    inputMode="decimal"
                    placeholder="RPE"
                    value={r.rpe}
                    onChange={(e) => update(i, { rpe: e.target.value })}
                  />
                </>
              )}
              <Button
                type="button"
                size="icon"
                variant={r.done ? "default" : "outline"}
                className="ml-auto size-10 shrink-0"
                aria-label={r.done ? `Serie ${i + 1} hecha` : `Marcar serie ${i + 1} como hecha`}
                aria-pressed={r.done}
                onClick={() => {
                  update(i, { done: !r.done });
                  if (!r.done) onSetDone();
                }}
              >
                <Check className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={addRow}>
        <Plus className="size-3.5" /> Serie
      </Button>
    </div>
  );
}

/** Cronómetro / cuenta atrás para AMRAP, EMOM, for time, tabata, carrera e HYROX. */
function PartTimer({ part }: { part: PartNode }) {
  const countdown =
    part.format === "amrap" && part.params.minutes ? part.params.minutes * 60 : (part.params.time_cap_s ?? null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [accum, setAccum] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const ended = useRef(false);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(t);
  }, [startedAt]);
  const elapsed = accum + (startedAt ? Math.max(0, Math.floor((nowMs - startedAt) / 1000)) : 0);
  const shown = countdown ? Math.max(0, countdown - elapsed) : elapsed;
  const emomEvery = part.format === "emom" ? (part.params.every_s ?? 60) : null;
  useEffect(() => {
    if (countdown && shown === 0 && startedAt && !ended.current) {
      ended.current = true;
      beep();
      setAccum(countdown);
      setStartedAt(null);
    }
  }, [countdown, shown, startedAt]);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground">
      <span className="font-mono text-3xl font-bold tabular-nums" aria-live="off">
        {formatDuration(shown)}
      </span>
      {emomEvery ? <span className="text-sm">Ronda {Math.floor(elapsed / emomEvery) + 1}</span> : null}
      <div className="ml-auto flex gap-1">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={startedAt ? "Pausar" : "Empezar"}
          onClick={() => {
            if (startedAt) {
              setAccum(elapsed);
              setStartedAt(null);
            } else {
              ended.current = false;
              const t0 = Date.now();
              setNowMs(t0);
              setStartedAt(t0);
            }
          }}
        >
          {startedAt ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Reiniciar"
          onClick={() => {
            setStartedAt(null);
            setAccum(0);
            ended.current = false;
          }}
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </div>
  );
}

const FEELINGS = [
  { v: 1, e: "😫", l: "Fatal" },
  { v: 2, e: "😕", l: "Regular" },
  { v: 3, e: "😐", l: "Normal" },
  { v: 4, e: "🙂", l: "Bien" },
  { v: 5, e: "🔥", l: "Brutal" },
];

function FinishDialog({
  open,
  onOpenChange,
  pending,
  onFinish,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pending: boolean;
  onFinish: (f: { rpe: number | null; feeling: number | null; comment: string }) => void;
}) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [feeling, setFeeling] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Qué tal ha ido?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Esfuerzo de la sesión (RPE 1–10)</Label>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={rpe === n}
                  onClick={() => setRpe(n)}
                  className={cn(
                    "h-10 rounded-md border text-sm font-semibold",
                    rpe === n && "bg-primary text-primary-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sensaciones</Label>
            <div className="flex justify-between">
              {FEELINGS.map((f) => (
                <button
                  key={f.v}
                  type="button"
                  aria-pressed={feeling === f.v}
                  aria-label={f.l}
                  onClick={() => setFeeling(f.v)}
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full border text-2xl",
                    feeling === f.v && "border-accent bg-secondary",
                  )}
                >
                  {f.e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wcomment">Comentario para Jaime (opcional)</Label>
            <Textarea
              id="wcomment"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Me ha molestado un poco la rodilla en la última serie…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button className="w-full" size="lg" disabled={pending} onClick={() => onFinish({ rpe, feeling, comment })}>
            {pending ? "Guardando…" : "Guardar entreno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkoutSummary({
  title,
  elapsed,
  doneSets,
  records,
  offline,
}: {
  title: string;
  elapsed: number;
  doneSets: number;
  records: { label: string; value: string }[];
  offline: boolean;
}) {
  const recordsText = useMemo(() => records, [records]);
  return (
    <div className="flex flex-col items-center gap-5 py-8 text-center">
      <div className="twj-pop flex size-24 items-center justify-center rounded-full bg-accent text-5xl text-accent-foreground">
        {recordsText.length ? "🏆" : "💪"}
      </div>
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold">Entreno guardado. Hoy ganas.</h1>
        <p className="text-muted-foreground">
          {title} · {formatDuration(elapsed)} · {doneSets} series
        </p>
        {offline ? (
          <p className="rounded-lg bg-warning/15 p-2 text-sm">
            Sin conexión: está guardado en tu móvil y se envía solo en cuanto vuelva la red.
          </p>
        ) : null}
      </div>
      {recordsText.length ? (
        <ul className="w-full space-y-2">
          {recordsText.map((r) => (
            <li key={r.label} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left">
              <Trophy className="size-5 shrink-0 text-accent" aria-hidden />
              <span className="flex-1 text-sm">{r.label}</span>
              <strong className="tabular-nums">{r.value}</strong>
            </li>
          ))}
        </ul>
      ) : null}
      <Button asChild className="w-full" size="lg">
        <Link href="/hoy">Volver a Hoy</Link>
      </Button>
      <Link href="/entreno/historial" className="text-sm underline">
        Ver historial
      </Link>
    </div>
  );
}
