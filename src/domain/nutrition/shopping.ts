export type ShoppingInput = {
  foodId: string;
  name: string;
  section: string;
  grams: number | null; // por persona
  units: number | null; // por persona (si se pidió en unidades y no hay peso por unidad)
  packSizeG: number | null;
  priceCents: number | null; // precio del envase
};

export type ShoppingLine = {
  foodId: string;
  name: string;
  section: string;
  grams: number | null;
  units: number | null;
  packs: number | null;
  estimatedCents: number | null;
};

/**
 * Lista de la compra: suma lo mismo de toda la semana, multiplica por personas,
 * calcula envases (redondeando hacia arriba) y su coste si hay precio.
 * Ordenada por sección del súper y nombre.
 */
export function buildShoppingList(items: ShoppingInput[], persons: number): ShoppingLine[] {
  const byFood = new Map<string, ShoppingLine & { packSizeG: number | null; priceCents: number | null }>();
  for (const it of items) {
    const cur = byFood.get(it.foodId) ?? {
      foodId: it.foodId,
      name: it.name,
      section: it.section,
      grams: null,
      units: null,
      packs: null,
      estimatedCents: null,
      packSizeG: it.packSizeG,
      priceCents: it.priceCents,
    };
    if (it.grams != null) cur.grams = (cur.grams ?? 0) + it.grams * persons;
    if (it.units != null) cur.units = (cur.units ?? 0) + it.units * persons;
    byFood.set(it.foodId, cur);
  }
  return [...byFood.values()]
    .map(({ packSizeG, priceCents, ...l }) => {
      const packs = l.grams != null && packSizeG ? Math.max(1, Math.ceil(l.grams / packSizeG - 1e-9)) : null;
      return {
        ...l,
        grams: l.grams == null ? null : Math.round(l.grams),
        packs,
        estimatedCents: packs != null && priceCents != null ? packs * priceCents : null,
      };
    })
    .sort((a, b) => a.section.localeCompare(b.section, "es") || a.name.localeCompare(b.name, "es"));
}

/** Coste total estimado (solo líneas con precio) y cuántas líneas no lo tienen. */
export function shoppingTotals(lines: ShoppingLine[]) {
  const priced = lines.filter((l) => l.estimatedCents != null);
  return { totalCents: priced.reduce((s, l) => s + l.estimatedCents!, 0), missingPrices: lines.length - priced.length };
}

/** Presupuesto semanal a partir del de la ficha (semana o mes). */
export function weeklyBudgetCents(budgetCents: number | null, period: "week" | "month"): number | null {
  if (budgetCents == null) return null;
  return period === "week" ? budgetCents : Math.round((budgetCents * 12) / 52);
}
