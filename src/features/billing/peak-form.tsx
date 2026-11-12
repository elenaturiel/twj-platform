"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPeakApplication } from "./peak-actions";

export function PeakForm() {
  const [state, action, pending] = useActionState(submitPeakApplication, undefined);
  const fe = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <div className="rounded-2xl bg-secondary p-6 text-center">
        <p className="text-xl font-bold">Solicitud enviada.</p>
        <p className="mt-1 text-muted-foreground">
          Jaime te escribe en menos de 48 h para cerrar tu pack. Ve calentando.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
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
          <Label htmlFor="phone">Teléfono (opcional)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="packWeeks">Duración del pack</Label>
          <select
            id="packWeeks"
            name="packWeeks"
            defaultValue="10"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="8">8 semanas</option>
            <option value="10">10 semanas</option>
            <option value="12">12 semanas</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventName">Tu prueba</Label>
          <Input
            id="eventName"
            name="eventName"
            placeholder="HYROX Valencia, media maratón…"
            aria-invalid={!!fe.eventName}
          />
          {fe.eventName ? <p className="text-xs text-destructive">{fe.eventName}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventDate">Fecha (si la sabes)</Label>
          <Input id="eventDate" name="eventDate" type="date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Cuéntale a Jaime dónde estás ahora</Label>
        <Textarea id="message" name="message" rows={4} placeholder="Nivel, marcas, lesiones, cuánto puedes entrenar…" />
      </div>
      <Label className="flex items-start gap-3 font-normal">
        <Checkbox name="acceptPrivacy" value="on" aria-invalid={!!fe.acceptPrivacy} />
        <span>Acepto que TWJ use estos datos para contactarme sobre el plan Peak (política de privacidad).</span>
      </Label>
      {fe.acceptPrivacy ? <p className="text-xs text-destructive">{fe.acceptPrivacy}</p> : null}
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enviando…" : "Voy a por mi Peak"}
      </Button>
    </form>
  );
}
