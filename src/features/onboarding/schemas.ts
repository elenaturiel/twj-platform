import { z } from "zod";
import { EU_ALLERGENS } from "@/domain/onboarding/rules";

const allergenKeys = EU_ALLERGENS.map((a) => a.key) as [string, ...string[]];

/** La ficha de onboarding: exactamente los campos acordados (ni más ni menos). */
export const intakeSchema = z.object({
  goal: z.string().trim().min(3, { error: "Cuéntanos tu objetivo" }).max(500),
  birthDate: z.iso.date({ error: "Fecha no válida" }).refine(
    (d) => {
      const y = Number(d.slice(0, 4));
      const now = new Date().getFullYear();
      return y > now - 100 && y < now - 8;
    },
    { error: "Revisa la fecha de nacimiento" },
  ),
  injuries: z.string().trim().max(1000).default(""),
  experience: z.enum(["none", "beginner", "intermediate", "advanced"], { error: "Elige tu experiencia" }),
  availableDays: z.array(z.number().int().min(0).max(6)).min(1, { error: "Marca al menos un día" }),
  equipment: z.enum(["gym", "home", "both"], { error: "¿Dónde entrenas?" }),
  equipmentNotes: z.string().trim().max(500).default(""),
  allergens: z.array(z.enum(allergenKeys)).default([]),
  allergyNotes: z.string().trim().max(500).default(""),
  foodBudgetEuros: z.coerce.number().min(0).max(1000).nullable().default(null),
  foodBudgetPeriod: z.enum(["week", "month"]).default("week"),
  classSchedule: z.string().trim().max(500).default(""),
});
export type IntakeInput = z.input<typeof intakeSchema>;
export type Intake = z.output<typeof intakeSchema>;

export const healthSchema = z.object({
  version: z.string(),
  answers: z.record(z.string(), z.object({ answer: z.boolean(), notes: z.string().max(500).optional() })),
});

export const guardianSchema = z.object({
  name: z.string().trim().min(2, { error: "Nombre del tutor/a" }).max(120),
  email: z.email({ error: "Email no válido" }).trim().toLowerCase(),
});

export function intakeToRow(i: Intake) {
  return {
    goal: i.goal,
    birth_date: i.birthDate,
    injuries: i.injuries || null,
    experience: i.experience,
    available_days: i.availableDays,
    equipment: i.equipment,
    equipment_notes: i.equipmentNotes || null,
    allergens: i.allergens,
    allergy_notes: i.allergyNotes || null,
    food_budget_cents: i.foodBudgetEuros === null ? null : Math.round(i.foodBudgetEuros * 100),
    food_budget_period: i.foodBudgetPeriod,
    class_schedule: i.classSchedule || null,
  };
}
