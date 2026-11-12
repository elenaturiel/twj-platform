/** Los 14 alérgenos de declaración obligatoria en la UE (Reglamento 1169/2011). */
export const EU_ALLERGENS = [
  { key: "gluten", label: "Gluten" },
  { key: "crustaceans", label: "Crustáceos" },
  { key: "eggs", label: "Huevo" },
  { key: "fish", label: "Pescado" },
  { key: "peanuts", label: "Cacahuetes" },
  { key: "soy", label: "Soja" },
  { key: "milk", label: "Leche (incl. lactosa)" },
  { key: "nuts", label: "Frutos de cáscara" },
  { key: "celery", label: "Apio" },
  { key: "mustard", label: "Mostaza" },
  { key: "sesame", label: "Sésamo" },
  { key: "sulphites", label: "Sulfitos" },
  { key: "lupin", label: "Altramuces" },
  { key: "molluscs", label: "Moluscos" },
] as const;

export type AllergenKey = (typeof EU_ALLERGENS)[number]["key"];

/** Edad cumplida en una fecha (YYYY-MM-DD), sin depender de husos horarios. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age--;
  return age;
}

export const ADULT_AGE = 18;

export function isMinor(birthDate: string, today: string) {
  return ageOn(birthDate, today) < ADULT_AGE;
}

/** Cualquier "sí" en el cuestionario de salud marca la ficha para que Jaime la revise. */
export function healthScreeningHasFlags(answers: Record<string, { answer: boolean }>) {
  return Object.values(answers).some((a) => a.answer);
}
