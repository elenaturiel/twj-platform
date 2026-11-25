"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { DAY_NAMES } from "@/domain/training/week";
import { madridInstant } from "@/domain/agenda/slots";
import { addException, saveAgendaSettings, saveAvailability, updateAppointmentType } from "../staff-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Rule = { weekday: number; start_time: string; end_time: string; type_keys: string[] };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Error");
      toast.success(ok);
      router.refresh();
    });
  return { pending, run };
}

export function WeeklyAvailability({ initial, types }: { initial: Rule[]; types: { key: string; name: string }[] }) {
  const [rules, setRules] = useState<Rule[]>(
    initial.map((r) => ({ ...r, start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5) })),
  );
  const { pending, run } = useRun();
  const set = (i: number, patch: Partial<Rule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-3">
      {DAY_NAMES.map((name, wd) => (
        <div key={wd} className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-start">
          <p className="w-24 shrink-0 pt-1.5 font-medium">{name}</p>
          <div className="flex-1 space-y-2">
            {rules.map((r, i) =>
              r.weekday === wd ? (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    step={900}
                    value={r.start_time}
                    onChange={(e) => set(i, { start_time: e.target.value })}
                    className="w-28"
                    aria-label={`${name}: desde`}
                  />
                  <span aria-hidden>–</span>
                  <Input
                    type="time"
                    step={900}
                    value={r.end_time}
                    onChange={(e) => set(i, { end_time: e.target.value })}
                    className="w-28"
                    aria-label={`${name}: hasta`}
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={r.type_keys[0] ?? ""}
                    onChange={(e) => set(i, { type_keys: e.target.value ? [e.target.value] : [] })}
                    aria-label="Para qué citas"
                  >
                    <option value="">Todas las citas</option>
                    {types.map((t) => (
                      <option key={t.key} value={t.key}>
                        Solo {t.name.toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Quitar franja"
                    onClick={() => setRules(rules.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null,
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setRules([...rules, { weekday: wd, start_time: "18:00", end_time: "20:00", type_keys: [] }])
              }
            >
              <Plus className="size-4" /> Franja
            </Button>
          </div>
        </div>
      ))}
      <Button disabled={pending} onClick={() => run(() => saveAvailability(rules), "Horario guardado")}>
        Guardar horario
      </Button>
    </div>
  );
}

export function ExceptionForm() {
  const [kind, setKind] = useState<"blocked" | "extra">("blocked");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fromTime, setFromTime] = useState("00:00");
  const [toTime, setToTime] = useState("23:59");
  const [reason, setReason] = useState("");
  const { pending, run } = useRun();
  return (
    <form
      className="grid gap-2 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!from) return void toast.error("Pon la fecha de inicio.");
        run(
          () =>
            addException({
              kind,
              startsAt: madridInstant(from, fromTime).toISOString(),
              endsAt: madridInstant(to || from, toTime).toISOString(),
              reason,
            }),
          kind === "blocked" ? "Bloqueo añadido" : "Hueco extra añadido",
        );
      }}
    >
      <select
        className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-2"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        aria-label="Tipo"
      >
        <option value="blocked">Bloquear (vacaciones, evento…)</option>
        <option value="extra">Abrir hueco extra fuera del horario</option>
      </select>
      <div className="flex gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde (fecha)" required />
        <Input
          type="time"
          value={fromTime}
          onChange={(e) => setFromTime(e.target.value)}
          aria-label="Desde (hora)"
          className="w-28"
        />
      </div>
      <div className="flex gap-2">
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta (fecha)" />
        <Input
          type="time"
          value={toTime}
          onChange={(e) => setToTime(e.target.value)}
          aria-label="Hasta (hora)"
          className="w-28"
        />
      </div>
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional)"
        aria-label="Motivo"
        className="sm:col-span-2"
      />
      <Button type="submit" variant="outline" disabled={pending} className="sm:col-span-2">
        Añadir
      </Button>
    </form>
  );
}

type TypeRow = {
  key: string;
  name: string;
  description: string | null;
  modality: string;
  duration_min: number;
  min_notice_h: number;
  cancel_notice_h: number;
  buffer_min: number;
  bookable_by_client: boolean;
  is_active: boolean;
  location: string | null;
  available_from: string | null;
};

export function TypeEditor({ t }: { t: TypeRow }) {
  const [v, setV] = useState(t);
  const { pending, run } = useRun();
  const num = (k: keyof TypeRow) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: Number(e.target.value) });
  return (
    <form
      className="space-y-2 rounded-xl border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            updateAppointmentType({
              ...v,
              description: v.description ?? "",
              location: v.location ?? "",
              available_from: v.available_from ?? "",
            }),
          "Tipo guardado",
        );
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          aria-label="Nombre"
          className="font-semibold"
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {v.modality === "online" ? "Videollamada" : "Presencial"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Label className="flex flex-col items-start gap-1">
          Duración (min)
          <Input type="number" value={v.duration_min} onChange={num("duration_min")} />
        </Label>
        <Label className="flex flex-col items-start gap-1">
          Antelación (h)
          <Input type="number" value={v.min_notice_h} onChange={num("min_notice_h")} />
        </Label>
        <Label className="flex flex-col items-start gap-1">
          Cancelar gratis (h)
          <Input type="number" value={v.cancel_notice_h} onChange={num("cancel_notice_h")} />
        </Label>
        <Label className="flex flex-col items-start gap-1">
          Margen (min)
          <Input type="number" value={v.buffer_min} onChange={num("buffer_min")} />
        </Label>
      </div>
      {v.modality === "in_person" ? (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Label className="flex flex-col items-start gap-1">
            Lugar
            <Input value={v.location ?? ""} onChange={(e) => setV({ ...v, location: e.target.value })} />
          </Label>
          <Label className="flex flex-col items-start gap-1">
            Disponible desde
            <Input
              type="date"
              value={v.available_from ?? ""}
              onChange={(e) => setV({ ...v, available_from: e.target.value || null })}
            />
          </Label>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={v.is_active} onCheckedChange={(c) => setV({ ...v, is_active: c })} /> Activa
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={v.bookable_by_client} onCheckedChange={(c) => setV({ ...v, bookable_by_client: c })} /> La
          reserva el cliente
        </label>
        <Button type="submit" size="sm" variant="outline" disabled={pending} className="ml-auto">
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function AgendaSettingsForm({
  fallbackMeetUrl,
  horizonDays,
}: {
  fallbackMeetUrl: string | null;
  horizonDays: number;
}) {
  const [url, setUrl] = useState(fallbackMeetUrl ?? "");
  const [days, setDays] = useState(horizonDays);
  const { pending, run } = useRun();
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveAgendaSettings({ fallbackMeetUrl: url, horizonDays: days }), "Ajustes guardados");
      }}
    >
      <Label htmlFor="fb">Enlace de videollamada fijo (si Google no está conectado)</Label>
      <Input
        id="fb"
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://meet.google.com/abc-defg-hij"
      />
      <Label htmlFor="hz">Días hacia delante que se pueden reservar</Label>
      <Input
        id="hz"
        type="number"
        min={7}
        max={120}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        className="w-28"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Guardar
      </Button>
    </form>
  );
}
