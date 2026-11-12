import { EU_ALLERGENS } from "@/domain/onboarding/rules";

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const EXPERIENCE_LABELS: Record<string, string> = {
  none: "Nunca he entrenado",
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export const EQUIPMENT_LABELS: Record<string, string> = { gym: "Gimnasio", home: "Casa", both: "Gimnasio y casa" };

export const FIELD_LABELS: Record<string, string> = {
  goal: "Objetivo",
  birth_date: "Fecha de nacimiento",
  injuries: "Lesiones / limitaciones",
  experience: "Experiencia",
  available_days: "Días disponibles",
  equipment: "Material",
  equipment_notes: "Notas de material",
  allergens: "Alergias",
  allergy_notes: "Alergias / intolerancias (notas)",
  food_budget_cents: "Presupuesto de comida",
  food_budget_period: "Periodo del presupuesto",
  class_schedule: "Horario de clases",
  full_name: "Nombre",
  phone: "Teléfono",
};

/** Valor legible para avisos y para el historial de cambios. */
export function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "available_days" && Array.isArray(value)) return value.map((d) => DAY_LABELS[d as number]).join(", ");
  if (field === "allergens" && Array.isArray(value)) {
    return value.map((k) => EU_ALLERGENS.find((a) => a.key === k)?.label ?? String(k)).join(", ") || "Ninguna";
  }
  if (field === "experience") return EXPERIENCE_LABELS[String(value)] ?? String(value);
  if (field === "equipment") return EQUIPMENT_LABELS[String(value)] ?? String(value);
  if (field === "food_budget_cents") return `${(Number(value) / 100).toFixed(2).replace(".", ",")} €`;
  if (field === "food_budget_period") return value === "week" ? "semana" : "mes";
  return String(value);
}
