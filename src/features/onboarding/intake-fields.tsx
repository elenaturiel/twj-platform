"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { EU_ALLERGENS } from "@/domain/onboarding/rules";
import { DAY_LABELS, EQUIPMENT_LABELS, EXPERIENCE_LABELS } from "./labels";
import type { Intake, IntakeInput } from "./schemas";

type Form = UseFormReturn<IntakeInput, unknown, Intake>;

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

// Lunes primero (como en España)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-3 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Campos de la ficha (los mismos en el onboarding y en el perfil). */
export function IntakeFields({ form }: { form: Form }) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="goal">¿Cuál es tu objetivo?</Label>
        <Textarea
          id="goal"
          rows={2}
          placeholder="Correr mi primer 10K, ganar fuerza, aprobar las físicas…"
          {...register("goal")}
        />
        <Err msg={errors.goal?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthDate">Fecha de nacimiento</Label>
        <Input id="birthDate" type="date" className="w-auto" {...register("birthDate")} />
        <Err msg={errors.birthDate?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="injuries">Lesiones o limitaciones</Label>
        <Textarea
          id="injuries"
          rows={2}
          placeholder="Si no tienes ninguna, déjalo en blanco"
          {...register("injuries")}
        />
      </div>

      <div className="space-y-2">
        <Label>Experiencia entrenando</Label>
        <Controller
          control={control}
          name="experience"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2">
              {Object.entries(EXPERIENCE_LABELS).map(([value, label]) => (
                <Label key={value} className="flex items-center gap-2 rounded-lg border p-3 font-normal">
                  <RadioGroupItem value={value} /> {label}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        <Err msg={errors.experience?.message} />
      </div>

      <div className="space-y-2">
        <Label>Días que puedes entrenar</Label>
        <Controller
          control={control}
          name="availableDays"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {WEEK_ORDER.map((d) => {
                const value = field.value ?? [];
                const active = value.includes(d);
                return (
                  <ToggleChip
                    key={d}
                    active={active}
                    onClick={() => field.onChange(active ? value.filter((x) => x !== d) : [...value, d].sort())}
                  >
                    {DAY_LABELS[d]}
                  </ToggleChip>
                );
              })}
            </div>
          )}
        />
        <Err msg={errors.availableDays?.message} />
      </div>

      <div className="space-y-2">
        <Label>¿Dónde entrenas?</Label>
        <Controller
          control={control}
          name="equipment"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-3 gap-2">
              {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                <Label key={value} className="flex items-center gap-2 rounded-lg border p-3 font-normal">
                  <RadioGroupItem value={value} /> {label}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        <Err msg={errors.equipment?.message} />
        <Input placeholder="Material que tienes (mancuernas, bandas…)" {...register("equipmentNotes")} />
      </div>

      <div className="space-y-2">
        <Label>Alergias e intolerancias</Label>
        <Controller
          control={control}
          name="allergens"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {EU_ALLERGENS.map((a) => {
                const value = field.value ?? [];
                const active = value.includes(a.key);
                return (
                  <ToggleChip
                    key={a.key}
                    active={active}
                    onClick={() => field.onChange(active ? value.filter((x) => x !== a.key) : [...value, a.key])}
                  >
                    {a.label}
                  </ToggleChip>
                );
              })}
            </div>
          )}
        />
        <Input placeholder="Otras intolerancias o comentarios" {...register("allergyNotes")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="foodBudgetEuros">Presupuesto para comida</Label>
        <div className="flex items-center gap-2">
          <Input
            id="foodBudgetEuros"
            type="number"
            inputMode="decimal"
            min={0}
            step="1"
            className="w-28"
            {...register("foodBudgetEuros", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })}
          />
          <span className="text-sm">€ /</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            {...register("foodBudgetPeriod")}
          >
            <option value="week">semana</option>
            <option value="month">mes</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground">El presupuesto de «estudihambre» real. Sin juzgar.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="classSchedule">Horario de clases (o trabajo)</Label>
        <Textarea
          id="classSchedule"
          rows={2}
          placeholder="Mañanas de 8 a 14, prácticas los jueves…"
          {...register("classSchedule")}
        />
      </div>
    </div>
  );
}
