import { describe, expect, it } from "vitest";
import { DIET_HEADERS, parseDietRows } from "./import";

const H = [...DIET_HEADERS];
const row = (v: Partial<Record<(typeof DIET_HEADERS)[number], string>>) =>
  Object.fromEntries(H.map((h) => [h, v[h] ?? ""]));

describe("parseDietRows", () => {
  it("agrupa por semana, día y comida, y respeta el orden escrito", () => {
    const r = parseDietRows(
      [
        row({ Día: "Lunes", Comida: "Desayuno", Plato: "Tostadas", Alimento: "Pan integral", "Cantidad (g)": "60" }),
        row({ Día: "Lunes", Comida: "Desayuno", Plato: "Tostadas", Alimento: "Huevo", Unidades: "2" }),
        row({ Día: "Lunes", Comida: "Comida", Alimento: "Lentejas", "Cantidad (g)": "250 g" }),
        row({ Día: "Lunes", Comida: "Media mañana", Alimento: "Plátano", Unidades: "1" }),
        row({ Semana: "2", Día: "miercoles", Comida: "cena", Alimento: "Tortilla", "Cantidad (g)": "150,5" }),
        row({}),
      ],
      H,
    );
    expect(r.errors).toEqual([]);
    expect(r.rowCount).toBe(5);
    expect(r.weeks).toHaveLength(2);
    const lunes = r.weeks[0]!.days[0]!;
    expect(lunes.dayIndex).toBe(0);
    expect(lunes.meals.map((m) => [m.slot, m.title, m.items.length])).toEqual([
      ["breakfast", "Tostadas", 2],
      ["lunch", null, 1],
      ["snack", "Media mañana", 1],
    ]);
    expect(lunes.meals[0]!.items[1]).toEqual({ food: "Huevo", grams: null, units: 2, notes: null });
    expect(r.weeks[1]!.days[0]).toMatchObject({ dayIndex: 2, meals: [{ slot: "dinner", items: [{ grams: 150.5 }] }] });
    expect(r.foods).toEqual(["Pan integral", "Huevo", "Lentejas", "Plátano", "Tortilla"]);
  });

  it("da errores por fila que se entienden", () => {
    const r = parseDietRows(
      [
        row({ Día: "Lunes", Comida: "Brunch", Alimento: "Pan", "Cantidad (g)": "60" }),
        row({ Día: "Funday", Comida: "Cena", Alimento: "Pan", "Cantidad (g)": "60" }),
        row({ Día: "Martes", Comida: "Cena", Alimento: "Pan" }),
        row({ Día: "Martes", Comida: "Cena", Alimento: "Pan", "Cantidad (g)": "mucho" }),
      ],
      H,
    );
    expect(r.weeks).toEqual([]);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 4, 5]);
    expect(r.errors[0]!.message).toContain("Comida no reconocida");
    expect(r.errors[1]!.message).toContain("Día no reconocido");
    expect(r.errors[2]!.message).toContain("gramos o en unidades");
    expect(r.errors[3]!.message).toContain("Cantidad no válida");
  });

  it("avisa si faltan columnas", () => {
    const r = parseDietRows([], ["Día", "Alimento"]);
    expect(r.errors.map((e) => e.message)).toEqual([
      "Falta la columna «Comida» en la pestaña Dieta",
      "Falta la columna «Cantidad (g)» o «Unidades» en la pestaña Dieta",
    ]);
  });
});
