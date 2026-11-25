"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, Loader2, MapPin, Video } from "lucide-react";
import { bookMyAppointment, loadSlots, rescheduleMyAppointment } from "../client-actions";
import { formatSlot, formatTime } from "@/domain/agenda/slots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BookableType = {
  key: string;
  name: string;
  description: string | null;
  duration_min: number;
  modality: string;
  location: string | null;
  credits: number | null; // null = no gasta créditos
  blockedReason: string | null;
};

const DOW = ["D", "L", "M", "X", "J", "V", "S"];

/** Elegir tipo → día → hueco → confirmar. También sirve para mover una cita (`rescheduleId`). */
export function BookingFlow({
  types,
  days,
  initialType,
  rescheduleId,
}: {
  types: BookableType[];
  days: string[];
  initialType?: string;
  rescheduleId?: string;
}) {
  const router = useRouter();
  const [typeKey, setTypeKey] = useState(
    initialType && types.some((t) => t.key === initialType)
      ? initialType
      : (types.find((t) => !t.blockedReason)?.key ?? types[0]?.key),
  );
  const [day, setDay] = useState(days[0]!);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  // Hasta que el cliente elige día, salta al primer día con huecos
  const [autoAdvance, setAutoAdvance] = useState(true);
  const type = types.find((t) => t.key === typeKey);

  useEffect(() => {
    if (!typeKey || type?.blockedReason) return;
    let alive = true;
    loadSlots(typeKey, day).then((s) => {
      if (!alive) return;
      const i = days.indexOf(day);
      if (autoAdvance && s.length === 0 && i < days.length - 1 && i < 14) setDay(days[i + 1]!);
      else setSlots(s);
    });
    return () => {
      alive = false;
    };
  }, [typeKey, day, type?.blockedReason, autoAdvance, days]);

  const choose = (fn: () => void) => {
    setSlots(null);
    setPicked(null);
    fn();
  };

  const confirm = () =>
    start(async () => {
      if (!picked || !typeKey) return;
      const r = rescheduleId
        ? await rescheduleMyAppointment(rescheduleId, picked)
        : await bookMyAppointment({ typeKey, startsAt: picked, notes: notes || undefined });
      if (!r.ok) {
        toast.error(r.error);
        setPicked(null);
        setSlots(await loadSlots(typeKey, day));
        return;
      }
      toast.success(rescheduleId ? "Cita movida" : "¡Reservada! Te llegará la confirmación.");
      router.push("/agenda");
      router.refresh();
    });

  return (
    <div className="space-y-5">
      {!rescheduleId ? (
        <section className="space-y-2" aria-label="Tipo de cita">
          {types.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                choose(() => {
                  setAutoAdvance(true);
                  setDay(days[0]!);
                  setTypeKey(t.key);
                })
              }
              aria-pressed={t.key === typeKey}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-colors",
                t.key === typeKey ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50",
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                {t.modality === "online" ? (
                  <Video className="size-4 text-accent" aria-hidden />
                ) : (
                  <MapPin className="size-4 text-accent" aria-hidden />
                )}
                {t.name}
                <span className="ml-auto text-xs font-normal text-muted-foreground">{t.duration_min} min</span>
              </span>
              {t.description ? <span className="mt-1 block text-sm text-muted-foreground">{t.description}</span> : null}
              <span className={cn("mt-1 block text-xs", t.blockedReason ? "text-warning" : "text-muted-foreground")}>
                {t.blockedReason ??
                  (t.credits == null
                    ? "Incluida en tu plan"
                    : t.credits === 1
                      ? "Te queda 1 crédito"
                      : `Te quedan ${t.credits} créditos`)}
              </span>
            </button>
          ))}
        </section>
      ) : null}

      {type && !type.blockedReason ? (
        <>
          <section className="space-y-2">
            <h2 className="font-semibold">Elige día</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="listbox" aria-label="Días">
              {days.map((d) => {
                const date = new Date(`${d}T12:00:00Z`);
                return (
                  <button
                    key={d}
                    type="button"
                    role="option"
                    aria-selected={d === day}
                    aria-label={date.toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })}
                    onClick={() =>
                      choose(() => {
                        setAutoAdvance(false);
                        setDay(d);
                      })
                    }
                    className={cn(
                      "flex w-12 shrink-0 flex-col items-center rounded-xl border py-2 text-sm",
                      d === day ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/50",
                    )}
                  >
                    <span className="text-xs">{DOW[date.getUTCDay()]}</span>
                    <span className="font-bold tabular-nums">{date.getUTCDate()}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2" aria-live="polite">
            <h2 className="font-semibold">Huecos libres</h2>
            {slots == null ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Buscando huecos…
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ese día no hay huecos. Prueba otro.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={picked === s ? "default" : "outline"}
                    onClick={() => setPicked(s)}
                    className="tabular-nums"
                  >
                    {formatTime(s)}
                  </Button>
                ))}
              </div>
            )}
          </section>

          {picked ? (
            <section className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 font-semibold">
                <CalendarCheck className="size-5 text-accent" aria-hidden />
                <span className="first-letter:uppercase">{formatSlot(picked)}</span>
              </p>
              {!rescheduleId ? (
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="¿Algo que quieras trabajar? (opcional)"
                  aria-label="Nota para Jaime"
                  maxLength={1000}
                />
              ) : null}
              <Button className="w-full" onClick={confirm} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                {rescheduleId ? "Mover a esta hora" : "Confirmar reserva"}
              </Button>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
