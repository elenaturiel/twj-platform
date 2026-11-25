"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2, MapPin, Plus, Trash2, Video } from "lucide-react";
import { formatSlot, formatTime, madridInstant, madridParts } from "@/domain/agenda/slots";
import {
  adjustCredits,
  recordManualExtraSession,
  saveAppointmentOutcome,
  staffBook,
  staffCancel,
  staffReschedule,
} from "../staff-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type StaffAppt = {
  id: string;
  client_id: string;
  type_key: string;
  starts_at: string;
  ends_at: string;
  status: string;
  modality: string;
  location: string | null;
  meet_url: string | null;
  credit_type: string | null;
  client_notes: string | null;
  staff_notes: string | null;
  summary: string | null;
  goals: string[];
  appointment_types: { name: string } | null;
  clients?: { id: string; profiles: { full_name: string } | null } | null;
};

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  confirmed: { label: "Confirmada", variant: "default" },
  completed: { label: "Hecha", variant: "secondary" },
  no_show: { label: "No vino", variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

/** Ficha de una cita en el panel: resultado, resumen con 3 objetivos, mover o cancelar. */
export function AppointmentDialog({ a, children }: { a: StaffAppt; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(a.status === "cancelled" ? "confirmed" : a.status);
  const [staffNotes, setStaffNotes] = useState(a.staff_notes ?? "");
  const [summary, setSummary] = useState(a.summary ?? "");
  const [goals, setGoals] = useState([0, 1, 2].map((i) => a.goals[i] ?? ""));
  const [notify, setNotify] = useState(!a.summary);
  const local = madridParts(a.starts_at);
  const [moveDate, setMoveDate] = useState(local.date);
  const [moveTime, setMoveTime] = useState(local.time);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Error");
      toast.success(r.message ?? ok);
      setOpen(false);
      router.refresh();
    });
  const cancelled = a.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {a.appointment_types?.name} · {a.clients?.profiles?.full_name ?? "Cliente"}
          </DialogTitle>
          <DialogDescription className="first-letter:uppercase">
            {formatSlot(a.starts_at)} – {formatTime(a.ends_at)}
            {a.credit_type
              ? ` · crédito: ${a.credit_type === "extra" ? "sesión extra" : a.credit_type === "monthly_call" ? "mensual" : "directo"}`
              : " · sin crédito"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {a.modality === "online" ? (
            a.meet_url ? (
              <a
                href={a.meet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-accent underline"
              >
                <Video className="size-4" /> {a.meet_url}
              </a>
            ) : (
              <p className="text-muted-foreground">
                Sin enlace de Meet (conecta Google o pon un enlace fijo en Disponibilidad).
              </p>
            )
          ) : (
            <p className="inline-flex items-center gap-1">
              <MapPin className="size-4" /> {a.location ?? "Presencial"}
            </p>
          )}
          {a.client_notes ? <p className="rounded-lg bg-muted/60 p-2">Nota del cliente: {a.client_notes}</p> : null}
          {a.clients?.id ? (
            <Link href={`/panel/clientes/${a.clients.id}/agenda`} className="block text-muted-foreground underline">
              Ver ficha del cliente
            </Link>
          ) : null}

          {!cancelled ? (
            <>
              <fieldset className="space-y-2">
                <legend className="font-semibold">Resultado</legend>
                <div className="flex gap-2">
                  {(["confirmed", "completed", "no_show"] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={status === s ? "default" : "outline"}
                      onClick={() => setStatus(s)}
                    >
                      {s === "confirmed" ? "Pendiente" : STATUS[s]!.label}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-1">
                <Label htmlFor="sn">Notas internas</Label>
                <Textarea id="sn" rows={2} value={staffNotes} onChange={(e) => setStaffNotes(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sum">Resumen para el cliente</Label>
                <Textarea
                  id="sum"
                  rows={3}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Qué hemos trabajado y cómo ha ido"
                />
              </div>
              <fieldset className="space-y-1">
                <legend className="font-medium">3 objetivos hasta la próxima</legend>
                {goals.map((g, i) => (
                  <Input
                    key={i}
                    value={g}
                    aria-label={`Objetivo ${i + 1}`}
                    placeholder={`Objetivo ${i + 1}`}
                    onChange={(e) => setGoals(goals.map((x, j) => (j === i ? e.target.value : x)))}
                  />
                ))}
              </fieldset>
              <label className="flex items-center gap-2">
                <Switch checked={notify} onCheckedChange={setNotify} /> Avisar al cliente del resumen
              </label>
              <Button
                className="w-full"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      saveAppointmentOutcome({
                        id: a.id,
                        status: status as "confirmed" | "completed" | "no_show",
                        staffNotes,
                        summary,
                        goals,
                        notifyClient: notify,
                      }),
                    "Guardado",
                  )
                }
              >
                Guardar
              </Button>

              {a.status === "confirmed" ? (
                <div className="space-y-2 border-t pt-3">
                  <p className="font-semibold">Mover</p>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={moveDate}
                      onChange={(e) => setMoveDate(e.target.value)}
                      aria-label="Nueva fecha"
                    />
                    <Input
                      type="time"
                      step={900}
                      value={moveTime}
                      onChange={(e) => setMoveTime(e.target.value)}
                      aria-label="Nueva hora"
                    />
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(() => staffReschedule(a.id, madridInstant(moveDate, moveTime).toISOString()), "Cita movida")
                      }
                    >
                      Mover
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-destructive"
                    disabled={pending}
                    onClick={() => run(() => staffCancel(a.id), "Cancelada")}
                  >
                    Cancelar cita (devuelve el crédito)
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Cita cancelada.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Semana del panel: 7 columnas en escritorio, lista en móvil. */
export function WeekBoard({
  days,
  appointments,
  today,
}: {
  days: { date: string; label: string }[];
  appointments: StaffAppt[];
  today: string;
}) {
  const byDay = new Map<string, StaffAppt[]>();
  for (const a of appointments) {
    const d = madridParts(a.starts_at).date;
    byDay.set(d, [...(byDay.get(d) ?? []), a]);
  }
  return (
    <div className="grid gap-2 lg:grid-cols-7">
      {days.map((d) => (
        <section
          key={d.date}
          className={cn(
            "min-h-24 space-y-2 rounded-xl border bg-card p-2",
            d.date === today && "border-primary ring-1 ring-primary",
          )}
        >
          <h2 className="text-xs font-semibold text-muted-foreground uppercase">{d.label}</h2>
          {(byDay.get(d.date) ?? []).map((a) => (
            <AppointmentDialog key={a.id} a={a}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-lg bg-muted/50 p-2 text-left text-xs hover:bg-muted",
                  a.status !== "confirmed" && "opacity-70",
                )}
              >
                <span className="flex items-center gap-1 font-semibold tabular-nums">
                  {a.modality === "online" ? (
                    <Video className="size-3" aria-hidden />
                  ) : (
                    <MapPin className="size-3" aria-hidden />
                  )}
                  {formatTime(a.starts_at)}
                </span>
                <span className="block truncate font-medium">{a.clients?.profiles?.full_name}</span>
                <span className="block truncate text-muted-foreground">{a.appointment_types?.name}</span>
                {a.status !== "confirmed" ? <StatusBadge status={a.status} /> : null}
              </button>
            </AppointmentDialog>
          ))}
        </section>
      ))}
    </div>
  );
}

/** Nueva cita desde el panel (cualquier hora; decide si gasta crédito). */
export function NewAppointment({
  clients,
  types,
  fixedClientId,
}: {
  clients: { id: string; name: string }[];
  types: { key: string; name: string }[];
  fixedClientId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [typeKey, setTypeKey] = useState(types[0]?.key ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [useCredit, setUseCredit] = useState(true);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <CalendarPlus className="size-4" /> Nueva cita
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>
            Desde el panel puedes agendar fuera del horario. Se crea el Meet si Google está conectado.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!clientId || !date) return void toast.error("Elige cliente y fecha.");
            start(async () => {
              const r = await staffBook({
                clientId,
                typeKey,
                startsAt: madridInstant(date, time).toISOString(),
                useCredit,
              });
              if (!r.ok) return void toast.error(r.error);
              toast.success("Cita creada");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {!fixedClientId ? (
            <div className="space-y-1">
              <Label htmlFor="nc-client">Cliente</Label>
              <select
                id="nc-client"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                <option value="">Elige…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="nc-type">Tipo</Label>
            <select
              id="nc-type"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
            >
              {types.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="nc-date">Fecha</Label>
              <Input id="nc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="w-32 space-y-1">
              <Label htmlFor="nc-time">Hora</Label>
              <Input
                id="nc-time"
                type="time"
                step={900}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={useCredit} onCheckedChange={setUseCredit} /> Descontar crédito del cliente
          </label>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null} Crear cita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Ajuste manual de créditos y registro de sesiones extra cobradas a mano. */
export function CreditsAdmin({ clientId, extraPriceCents }: { clientId: string; extraPriceCents: number | null }) {
  const router = useRouter();
  const [type, setType] = useState<"live_training" | "monthly_call" | "extra">("live_training");
  const [delta, setDelta] = useState(1);
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"bizum" | "transfer" | "cash" | "other">("bizum");
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await adjustCredits({ clientId, creditType: type, delta, expiresAt: expires, notes });
            if (!r.ok) return void toast.error(r.error);
            toast.success("Créditos actualizados");
            setNotes("");
            router.refresh();
          });
        }}
      >
        <p className="font-semibold">Ajustar créditos</p>
        <div className="flex gap-2">
          <select
            className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            aria-label="Tipo de crédito"
          >
            <option value="live_training">Entreno en directo</option>
            <option value="monthly_call">Videollamada mensual</option>
            <option value="extra">Sesión extra</option>
          </select>
          <Input
            type="number"
            min={-10}
            max={10}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="w-20"
            aria-label="Cantidad (+/−)"
          />
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            aria-label="Caduca (opcional)"
          />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo" aria-label="Motivo" />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={pending || delta === 0}>
          <Plus className="size-4" /> Aplicar
        </Button>
      </form>
      {extraPriceCents ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await recordManualExtraSession({ clientId, amountCents: extraPriceCents, method });
              if (!r.ok) return void toast.error(r.error);
              toast.success("Sesión extra registrada (+1 crédito)");
              router.refresh();
            });
          }}
        >
          <p className="font-semibold">Sesión extra cobrada a mano</p>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            aria-label="Método de pago"
          >
            <option value="bizum">Bizum</option>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
            <option value="other">Otro</option>
          </select>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Registrar pago y dar 1 crédito
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function DeleteButton({ onDelete, label }: { onDelete: () => Promise<unknown>; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={label}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await onDelete();
          router.refresh();
        })
      }
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
