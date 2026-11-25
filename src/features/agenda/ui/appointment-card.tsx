"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, MapPin, Target, Video, X } from "lucide-react";
import { cancelMyAppointment } from "../client-actions";
import { canCancelFree, formatSlot } from "@/domain/agenda/slots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export type CardAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  modality: string;
  location: string | null;
  meet_url: string | null;
  summary: string | null;
  goals: string[];
  late_cancel: boolean;
  appointment_types: { name: string; cancel_notice_h: number } | null;
};

const STATUS: Record<string, string> = {
  cancelled: "Cancelada",
  completed: "Hecha",
  no_show: "No asististe",
  confirmed: "Confirmada",
};

export function AppointmentCard({ a, upcoming, now }: { a: CardAppointment; upcoming: boolean; now: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const notice = a.appointment_types?.cancel_notice_h ?? 12;
  const free = canCancelFree(a.starts_at, notice, new Date(now));
  const startsIn = new Date(a.starts_at).getTime() - now;
  const live = startsIn < 15 * 60_000 && new Date(a.ends_at).getTime() > now;

  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        {a.modality === "online" ? (
          <Video className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        ) : (
          <MapPin className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{a.appointment_types?.name ?? "Cita"}</h3>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{formatSlot(a.starts_at)}</p>
          {a.modality === "in_person" && a.location ? (
            <p className="text-xs text-muted-foreground">{a.location}</p>
          ) : null}
        </div>
        {!upcoming ? (
          <Badge variant={a.status === "completed" ? "secondary" : "outline"}>{STATUS[a.status] ?? a.status}</Badge>
        ) : null}
      </div>

      {upcoming && a.modality === "online" ? (
        a.meet_url ? (
          <Button asChild className="w-full" variant={live ? "default" : "outline"}>
            <a href={a.meet_url} target="_blank" rel="noopener noreferrer">
              <Video className="size-4" /> {live ? "Entrar ahora a la videollamada" : "Enlace de la videollamada"}
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Jaime te enviará el enlace de la videollamada.</p>
        )
      ) : null}

      {upcoming ? (
        <div className="flex gap-2">
          {free ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/agenda/reservar?mover=${a.id}`}>
                <CalendarClock className="size-4" /> Cambiar hora
              </Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
            <X className="size-4" /> Cancelar
          </Button>
        </div>
      ) : null}

      {!upcoming && (a.summary || a.goals.length) ? (
        <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
          {a.summary ? <p className="whitespace-pre-line">{a.summary}</p> : null}
          {a.goals.length ? (
            <ul className="space-y-1">
              {a.goals.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <Target className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {g}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {!upcoming && a.status === "cancelled" && a.late_cancel ? (
        <p className="text-xs text-muted-foreground">Cancelada fuera de plazo: el crédito no se devolvió.</p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar la cita?</DialogTitle>
            <DialogDescription>
              {free
                ? "Te devolvemos el crédito para que reserves otro día."
                : `Faltan menos de ${notice} h: si cancelas ahora, el crédito no se devuelve.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            aria-label="Motivo"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Mantener
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await cancelMyAppointment(a.id, reason || undefined);
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(r.message ?? "Cancelada");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Cancelar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
