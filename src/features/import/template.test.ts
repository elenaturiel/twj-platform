import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

vi.mock("server-only", () => ({}));

import { buildImportTemplate, DIET_EXAMPLE_ROWS, DIET_SHEET, TRAINING_SHEET } from "./template.server";
import { readImportWorkbook } from "@/lib/excel-import";
import { parseWorkoutRows, suggestMapping, TEMPLATE_HEADERS, TEMPLATE_ROWS } from "@/domain/training/import";
import { DIET_HEADERS, parseDietRows } from "@/domain/nutrition/import";

describe("plantilla de Excel", () => {
  it("tiene las pestañas y cabeceras exactas que lee la plataforma", async () => {
    const buf = await buildImportTemplate({ exercises: ["Sentadilla trasera"], foods: ["Huevo"] });
    const wb = XLSX.read(buf);
    expect(wb.SheetNames).toEqual([
      "Instrucciones",
      TRAINING_SHEET,
      DIET_SHEET,
      "Ejemplo entreno",
      "Ejemplo dieta",
      "Listas",
    ]);
    const read = readImportWorkbook(buf);
    expect(read.training?.headers).toEqual(TEMPLATE_HEADERS);
    expect(read.diet?.headers).toEqual([...DIET_HEADERS]);
    // Vacía: no hay filas que importar
    expect(parseDietRows(read.diet!.rows, read.diet!.headers).rowCount).toBe(0);
  });

  it("rellenada como en los ejemplos, se lee a la primera y sin errores", async () => {
    const buf = await buildImportTemplate({ exercises: [], foods: [] });
    const wb = XLSX.read(buf);
    XLSX.utils.sheet_add_json(wb.Sheets[TRAINING_SHEET]!, TEMPLATE_ROWS, {
      header: TEMPLATE_HEADERS,
      skipHeader: true,
      origin: "A2",
    });
    XLSX.utils.sheet_add_json(wb.Sheets[DIET_SHEET]!, DIET_EXAMPLE_ROWS, {
      header: [...DIET_HEADERS],
      skipHeader: true,
      origin: "A2",
    });
    const filled = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    const read = readImportWorkbook(filled);
    const training = parseWorkoutRows(read.training!.rows, suggestMapping(read.training!.headers));
    expect(training.errors).toEqual([]);
    expect(training.blocks).toHaveLength(1);
    expect(training.blocks[0]!.weeks[0]!.sessions.map((s) => s.title)).toEqual(["Pierna", "Carrera suave", "WOD"]);

    const diet = parseDietRows(read.diet!.rows, read.diet!.headers);
    expect(diet.errors).toEqual([]);
    expect(diet.weeks[0]!.days[0]!.meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
  });

  it("un Excel antiguo de una sola pestaña se lee como entreno", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(TEMPLATE_ROWS, { header: TEMPLATE_HEADERS }), "Hoja1");
    const read = readImportWorkbook(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    expect(read.training?.name).toBe("Hoja1");
    expect(read.diet).toBeNull();
  });
});
