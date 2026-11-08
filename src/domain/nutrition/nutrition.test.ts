import { describe, expect, it } from "vitest";
import { allergenConflicts, allergensFromOff } from "./allergens";
import { itemMacros, portionGrams, roundMacros, sumMacros } from "./macros";
import { offToFood } from "./off";
import { buildShoppingList, shoppingTotals, weeklyBudgetCents } from "./shopping";

const avena = { kcal: 370, protein_g: 13, carbs_g: 60, fat_g: 7, unit_grams: null, verified: true };
const huevo = { kcal: 140, protein_g: 12.5, carbs_g: 0.7, fat_g: 9.8, unit_grams: 60, verified: false };

describe("macros", () => {
  it("por gramos y por unidades", () => {
    expect(portionGrams(avena, { quantity_g: 50, quantity_units: null })).toBe(50);
    expect(portionGrams(huevo, { quantity_g: null, quantity_units: 2 })).toBe(120);
    expect(roundMacros(itemMacros(avena, { quantity_g: 50, quantity_units: null }))).toMatchObject({
      kcal: 185,
      protein: 7,
      carbs: 30,
      fat: 4,
    });
  });
  it("suma de una comida y avisos de datos sin verificar", () => {
    const m = sumMacros([
      itemMacros(avena, { quantity_g: 50, quantity_units: null }),
      itemMacros(huevo, { quantity_g: null, quantity_units: 2 }),
    ]);
    expect(Math.round(m.kcal)).toBe(353);
    expect(m.unverified).toBe(true);
    expect(m.incomplete).toBe(false);
  });
  it("no inventa: sin dato → incompleto", () => {
    const m = itemMacros({ ...avena, fat_g: null }, { quantity_g: 100, quantity_units: null });
    expect(m.incomplete).toBe(true);
    expect(m.fat).toBe(0);
    const u = itemMacros({ ...avena, unit_grams: null }, { quantity_g: null, quantity_units: 1 });
    expect(u.incomplete).toBe(true);
  });
});

describe("lista de la compra", () => {
  const base = { section: "Desayuno y cereales", packSizeG: 500, priceCents: 110, units: null };
  it("suma la semana, multiplica por personas y redondea envases", () => {
    const lines = buildShoppingList(
      [
        { ...base, foodId: "avena", name: "Copos de avena", grams: 50 },
        { ...base, foodId: "avena", name: "Copos de avena", grams: 60 },
        {
          foodId: "huevos",
          name: "Huevos",
          section: "Huevos",
          grams: null,
          units: 2,
          packSizeG: null,
          priceCents: null,
        },
      ],
      3,
    );
    expect(lines.find((l) => l.foodId === "avena")).toMatchObject({ grams: 330, packs: 1, estimatedCents: 110 });
    expect(lines.find((l) => l.foodId === "huevos")).toMatchObject({ units: 6, packs: null, estimatedCents: null });
    expect(shoppingTotals(lines)).toEqual({ totalCents: 110, missingPrices: 1 });
  });
  it("varios envases", () => {
    const [l] = buildShoppingList([{ ...base, foodId: "a", name: "A", grams: 1200 }], 1);
    expect(l).toMatchObject({ packs: 3, estimatedCents: 330 });
  });
  it("presupuesto semanal", () => {
    expect(weeklyBudgetCents(4000, "week")).toBe(4000);
    expect(weeklyBudgetCents(13000, "month")).toBe(3000);
    expect(weeklyBudgetCents(null, "week")).toBeNull();
  });
});

describe("alérgenos", () => {
  it("traduce etiquetas de OFF y detecta choques", () => {
    expect(allergensFromOff(["en:milk", "en:gluten", "en:otro"])).toEqual(["milk", "gluten"]);
    expect(allergenConflicts(["milk", "gluten"], ["gluten"])).toEqual(["gluten"]);
  });
});

describe("Open Food Facts", () => {
  it("convierte un producto sin inventar datos", () => {
    const f = offToFood({
      code: "123",
      product_name: "Copos de avena",
      brands: "Hacendado, Mercadona",
      product_quantity: "500",
      nutriments: { "energy-kcal_100g": 372, proteins_100g: 13.5, carbohydrates_100g: "58,7", fat_100g: 7 },
      allergens_tags: ["en:gluten"],
    });
    expect(f).toMatchObject({
      name: "Copos de avena",
      brand: "Hacendado",
      kcal: 372,
      carbs_g: 58.7,
      fiber_g: null,
      pack_size_g: 500,
      allergens: ["gluten"],
      verified: false,
      source: "off",
    });
  });
  it("kcal a partir de kJ si no viene en kcal", () => {
    expect(offToFood({ nutriments: { energy_100g: 418.4 } }).kcal).toBe(100);
  });
});
