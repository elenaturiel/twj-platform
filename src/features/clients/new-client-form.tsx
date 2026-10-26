"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientByStaff } from "./staff-actions";
import { MODALITY_LABELS } from "./ui";

type PlanOption = { key: string; name: string; priceCents: number | null; annualAllowed: boolean };

export function NewClientForm({ plans }: { plans: PlanOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [planKey, setPlanKey] = useState(plans[0]?.key ?? "");
  const [modalities, setModalities] = useState<string[]>([]);
  const plan = plans.find((p) => p.key === planKey);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const custom = String(f.get("customAmountEuros") ?? "");
    start(async () => {
      const res = await createClientByStaff({
        fullName: String(f.get("fullName")),
        email: String(f.get("email")),
        planKey,
        interval: f.get("interval") === "year" ? "year" : "month",
        billingMode: f.get("billingMode") === "stripe" ? "stripe" : "manual",
        customAmountEuros: custom === "" ? undefined : Number(custom.replace(",", ".")),
        studentClaim: f.get("studentClaim") === "on",
        modalities: modalities as never,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Cliente creado");
      router.push(`/panel/clientes/${res.clientId}/pagos`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre y apellidos</Label>
          <Input id="fullName" name="fullName" required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan">Plan</Label>
          <select
            id="plan"
            value={planKey}
            onChange={(e) => setPlanKey(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {plans.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="interval">Periodo</Label>
          <select
            id="interval"
            name="interval"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="month">Mensual</option>
            {plan?.annualAllowed ? <option value="year">Anual (−20 %)</option> : null}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billingMode">Cobro</Label>
          <select
            id="billingMode"
            name="billingMode"
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="manual">Manual (Bizum, transferencia, efectivo)</option>
            <option value="stripe">Stripe (le mandamos el enlace de pago)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="customAmountEuros">Importe pactado por periodo (€)</Label>
          <Input
            id="customAmountEuros"
            name="customAmountEuros"
            inputMode="decimal"
            placeholder={
              plan?.priceCents == null ? "Obligatorio en planes a medida" : "Vacío = precio del plan con descuentos"
            }
            required={plan?.priceCents == null}
          />
        </div>
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox name="studentClaim" /> Universitario/a (−10 %, pendiente de carné)
      </Label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Modalidades</legend>
        <div className="flex flex-wrap gap-3">
          {Object.entries(MODALITY_LABELS).map(([key, label]) => (
            <Label key={key} className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={modalities.includes(key)}
                onCheckedChange={(v) => setModalities((m) => (v ? [...m, key] : m.filter((x) => x !== key)))}
              />
              {label}
            </Label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Le llega un email de invitación para poner su contraseña. El acceso se activa con el primer pago registrado.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear e invitar"}
      </Button>
    </form>
  );
}
