import * as XLSX from "xlsx";

export type SheetData = { name: string; headers: string[]; rows: Record<string, unknown>[] };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

const TRAINING_NAMES = ["entreno", "entrenamiento", "rutinas", "rutina", "training"];
const DIET_NAMES = ["dieta", "menu", "menus", "nutricion", "comidas"];

function readSheet(ws: XLSX.WorkSheet, name: string): SheetData {
  const headers = (XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] ?? []).map((h) => String(h ?? "").trim());
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: false });
  return { name, headers: headers.filter(Boolean), rows };
}

/**
 * Lee el Excel de Jaime y localiza cada pestaña por su nombre (da igual el orden).
 * Un Excel antiguo de una sola pestaña sin nombre reconocible se toma como Entreno.
 */
export function readImportWorkbook(data: ArrayBuffer | Uint8Array): {
  training: SheetData | null;
  diet: SheetData | null;
} {
  const wb = XLSX.read(data, { cellDates: false });
  const find = (names: string[]) => wb.SheetNames.find((n) => names.includes(norm(n)));
  const t = find(TRAINING_NAMES);
  const d = find(DIET_NAMES);
  const fallback = !t && !d && wb.SheetNames.length ? wb.SheetNames[0] : undefined;
  const trainingName = t ?? fallback;
  return {
    training: trainingName ? readSheet(wb.Sheets[trainingName]!, trainingName) : null,
    diet: d ? readSheet(wb.Sheets[d]!, d) : null,
  };
}
