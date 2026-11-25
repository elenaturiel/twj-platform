"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HYROX_DIVISIONS } from "./plan-application";
import { submitPlanApplication } from "./plan-application-actions";

const selectCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

/** Formulario para pedir un plan a medida (HYROX). */
export function PlanApplicationForm({ planKey, planName }: { planKey: string; planName: string }) {
  const [state, action, pending] = useActionState(submitPlanApplication, undefined);
  const fe = state?.fieldErrors ?? {};
  const hyrox = planKey === "hyrox";

  if (state?.ok) {
    return (
      <div className="rounded-2xl bg-secondary p-6 text-center">
        <p className="text-xl font-bold">Solicitud enviada.</p>
        <p className="mt-1 text-muted-foreground">
          Jaime te escribe para hablar de tu caso y proponerte el plan: duración, precio y lo que incluye.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="planKey" value={planKey} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" autoComplete="name" aria-invalid={!!fe.name} />
          {fe.name ? <p className="text-xs text-destructive">{fe.name}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!fe.email} />
          {fe.email ? <p className="text-xs text-destructive">{fe.email}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        {hyrox ? (
          <div className="space-y-2">
            <Label htmlFor="division">Categoría</Label>
            <select id="division" name="division" defaultValue="" className={selectCls}>
              <option value="">Elige…</option>
              {HYROX_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="eventName">{hyrox ? "¿Qué carrera HYROX? (si la tienes)" : "Tu objetivo o prueba"}</Label>
          <Input id="eventName" name="eventName" placeholder={hyrox ? "HYROX Madrid, Valencia…" : ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventDate">Fecha (si la sabes)</Label>
          <Input id="eventDate" name="eventDate" type="date" aria-invalid={!!fe.eventDate} />
          {fe.eventDate ? <p className="text-xs text-destructive">{fe.eventDate}</p> : null}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Cuéntale a Jaime dónde estás ahora</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder={
            hyrox
              ? "Si ya has hecho alguna HYROX y tu tiempo, cuánto corres, gimnasio al que tienes acceso, lesiones…"
              : "Nivel, marcas, lesiones, cuánto puedes entrenar…"
          }
        />
      </div>
      <Label className="flex items-start gap-3 font-normal">
        <Checkbox name="acceptPrivacy" value="on" aria-invalid={!!fe.acceptPrivacy} />
        <span>Acepto que TWJ use estos datos para contactarme sobre el plan {planName} (política de privacidad).</span>
      </Label>
      {fe.acceptPrivacy ? <p className="text-xs text-destructive">{fe.acceptPrivacy}</p> : null}
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enviando…" : `Solicitar ${planName}`}
      </Button>
    </form>
  );
}
