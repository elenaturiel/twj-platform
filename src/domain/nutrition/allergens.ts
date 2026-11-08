/** Etiquetas de alérgenos de Open Food Facts → claves de los 14 alérgenos UE de la ficha. */
const OFF_TO_KEY: Record<string, string> = {
  "en:gluten": "gluten",
  "en:crustaceans": "crustaceans",
  "en:eggs": "eggs",
  "en:fish": "fish",
  "en:peanuts": "peanuts",
  "en:soybeans": "soy",
  "en:milk": "milk",
  "en:nuts": "nuts",
  "en:celery": "celery",
  "en:mustard": "mustard",
  "en:sesame-seeds": "sesame",
  "en:sulphur-dioxide-and-sulphites": "sulphites",
  "en:lupin": "lupin",
  "en:molluscs": "molluscs",
};

export function allergensFromOff(tags: string[] | undefined | null): string[] {
  return [...new Set((tags ?? []).map((t) => OFF_TO_KEY[t]).filter(Boolean) as string[])];
}

/** Alérgenos del alimento que choca con la ficha del cliente. */
export function allergenConflicts(foodAllergens: string[], clientAllergens: string[]): string[] {
  const set = new Set(clientAllergens);
  return foodAllergens.filter((a) => set.has(a));
}
