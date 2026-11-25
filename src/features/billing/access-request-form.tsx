"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requestAccess, type AccessRequestState } from "./access-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AccessRequestForm({ planKey, planName }: { planKey?: string; planName?: string }) {
  const [state, action, pending] = useActionState<AccessRequestState, FormData>(requestAccess, undefined);
  if (state?.ok)
    return (
      <div className="space-y-3 rounded-2xl border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="text-2xl font-extrabold">¡Solicitud enviada!</h2>
        <p className="text-muted-foreground">Jaime la revisa y te escribe con tu acceso. ¿Y tú, quieres ganar?</p>
      </div>
    );
  return (
    <form action={action} className="max-w-xl space-y-4 rounded-2xl border bg-card p-6">
      <p className="text-sm text-muted-foreground">
        Las plazas son limitadas: déjanos tus datos{planName ? ` (plan ${planName})` : ""} y Jaime te escribe para
        empezar.
      </p>
      {planKey ? <input type="hidden" name="planKey" value={planKey} /> : null}
      <div className="space-y-1">
        <Label htmlFor="ar-name">Nombre y apellidos</Label>
        <Input id="ar-name" name="name" required autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="ar-email">Email</Label>
          <Input id="ar-email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ar-phone">Teléfono (WhatsApp)</Label>
          <Input id="ar-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ar-msg">¿Qué objetivo tienes? (opcional)</Label>
        <Textarea id="ar-msg" name="message" rows={3} />
      </div>
      <div aria-hidden className="absolute -left-[9999px] size-0 overflow-hidden">
        <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="privacy" required className="mt-0.5 size-4" />
        <span>
          Acepto la{" "}
          <Link href="/legal/privacidad" target="_blank" className="underline">
            política de privacidad
          </Link>
          .
        </span>
      </label>
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Solicitar plaza"}
      </Button>
    </form>
  );
}
