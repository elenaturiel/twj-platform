import { describe, expect, it } from "vitest";
import { parseWorkoutRows, suggestMapping, TEMPLATE_HEADERS, TEMPLATE_ROWS } from "./import";

describe("importador de rutinas", () => {
  const mapping = suggestMapping(TEMPLATE_HEADERS);

  it("sugiere el mapeo a partir de las cabeceras de la plantilla", () => {
    expect(mapping).toMatchObject({
      block: "Bloque",
      week: "Semana",
      day: "Día",
      session: "Sesión",
      exercise: "Ejercicio",
      load_kg: "Carga (kg)",
    });
  });

  it("la plantilla de ejemplo se importa sin errores", () => {
    const res = parseWorkoutRows(TEMPLATE_ROWS, mapping);
    expect(res.errors).toEqual([]);
    expect(res.blocks).toHaveLength(1);
    const week = res.blocks[0]!.weeks[0]!;
    expect(week.sessions.map((s) => s.title)).toEqual(["Pierna", "Carrera suave", "WOD"]);
    expect(week.sessions[0]!.dayIndex).toBe(0);
    expect(week.sessions[0]!.parts[0]!.items).toHaveLength(2);
    expect(week.sessions[0]!.parts[0]!.items[0]!.prescription).toMatchObject({
      sets: 4,
      reps: "6-8",
      load_kg: 70,
      rpe: 8,
      rest_s: 150,
    });
    expect(week.sessions[1]!.parts[0]).toMatchObject({ modality: "running", format: "run" });
    expect(week.sessions[1]!.parts[0]!.items[0]!.prescription).toMatchObject({
      distance_m: 6000,
      pace_min_s: 360,
      pace_max_s: 390,
      hr_zone: "Z2",
    });
    expect(week.sessions[2]!.parts[0]).toMatchObject({ modality: "functional", format: "amrap" });
  });

  it("devuelve errores fila a fila y no importa nada si hay alguno", () => {
    const rows = [
      { ...TEMPLATE_ROWS[0]!, Semana: "cero", RPE: "12" },
      { ...TEMPLATE_ROWS[1]!, Ejercicio: "", Día: "Funday" },
      { ...TEMPLATE_ROWS[2]!, Descanso: "abc", Modalidad: "natación" },
    ];
    const res = parseWorkoutRows(rows, mapping);
    expect(res.blocks).toEqual([]);
    const byRow = (r: number) => res.errors.filter((e) => e.row === r).map((e) => e.field);
    expect(byRow(2).sort()).toEqual(["rpe", "week"]);
    expect(byRow(3).sort()).toEqual(["day", "exercise"]);
    expect(byRow(4).sort()).toEqual(["modality", "rest"]);
  });

  it("avisa si falta mapear una columna obligatoria", () => {
    const res = parseWorkoutRows(TEMPLATE_ROWS, { ...mapping, exercise: undefined });
    expect(res.errors[0]).toMatchObject({ row: 0, field: "exercise" });
  });

  it("ignora filas vacías", () => {
    const res = parseWorkoutRows([TEMPLATE_ROWS[0]!, { Bloque: "", Semana: "" }], mapping);
    expect(res.errors).toEqual([]);
  });
});
