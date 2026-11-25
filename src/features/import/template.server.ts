import "server-only";
import ExcelJS from "exceljs";
import { TEMPLATE_HEADERS, TEMPLATE_ROWS } from "@/domain/training/import";
import { DIET_HEADERS, SLOT_CHOICES } from "@/domain/nutrition/import";

export const TRAINING_SHEET = "Entreno";
export const DIET_SHEET = "Dieta";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MODALITIES = ["gym", "funcional", "running", "hyrox"];
const FORMATS = [
  "series",
  "superserie",
  "circuito",
  "amrap",
  "emom",
  "for time",
  "tabata",
  "rondas",
  "carrera",
  "simulacro",
  "estaciones",
];
const ROWS = 500; // filas preparadas con desplegables

export const DIET_EXAMPLE_ROWS: Record<string, string>[] = [
  {
    Semana: "1",
    Día: "Lunes",
    Comida: "Desayuno",
    Plato: "Tostadas con huevo",
    Alimento: "Pan integral",
    "Cantidad (g)": "60",
    Unidades: "",
    Notas: "",
  },
  {
    Semana: "1",
    Día: "Lunes",
    Comida: "Desayuno",
    Plato: "Tostadas con huevo",
    Alimento: "Huevo",
    "Cantidad (g)": "",
    Unidades: "2",
    Notas: "A la plancha",
  },
  {
    Semana: "1",
    Día: "Lunes",
    Comida: "Comida",
    Plato: "Lentejas",
    Alimento: "Lentejas cocidas",
    "Cantidad (g)": "250",
    Unidades: "",
    Notas: "",
  },
  {
    Semana: "1",
    Día: "Lunes",
    Comida: "Merienda",
    Plato: "",
    Alimento: "Yogur natural",
    "Cantidad (g)": "",
    Unidades: "1",
    Notas: "",
  },
  {
    Semana: "1",
    Día: "Lunes",
    Comida: "Cena",
    Plato: "Salmón con verduras",
    Alimento: "Salmón",
    "Cantidad (g)": "150",
    Unidades: "",
    Notas: "",
  },
];

const BRAND = "FF0B1F3A"; // azul TWJ (cabeceras)
const ACCENT = "FF2B9BE0";

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
  row.alignment = { vertical: "middle" };
  row.height = 22;
}

/** Desplegable en una columna: lista fija o rango de la pestaña «Listas». */
function dropdown(ws: ExcelJS.Worksheet, col: number, formula: string, strict: boolean, prompt: string) {
  for (let r = 2; r <= ROWS + 1; r++) {
    ws.getCell(r, col).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [formula],
      showErrorMessage: true,
      // Ejercicios y alimentos: se puede escribir uno nuevo (solo avisa)
      errorStyle: strict ? "stop" : "warning",
      errorTitle: strict ? "Valor no válido" : "No está en tu biblioteca",
      error: strict ? "Elige una opción de la lista." : "No está en tu biblioteca. Se creará al importar. ¿Seguro?",
      showInputMessage: Boolean(prompt),
      prompt,
    };
  }
}

function asText(ws: ExcelJS.Worksheet, cols: number[]) {
  // Texto: que Excel no convierta «8-10» en fecha ni «1:30» en hora
  for (const c of cols) {
    ws.getColumn(c).numFmt = "@";
    for (let r = 2; r <= ROWS + 1; r++) ws.getCell(r, c).numFmt = "@";
  }
}

/**
 * Plantilla de Excel para Jaime: pestañas Instrucciones, Entreno y Dieta, con
 * desplegables (días, comidas, modalidades, formatos, y los ejercicios y alimentos
 * de su biblioteca). Las cabeceras son exactamente las que lee la plataforma.
 */
export async function buildImportTemplate(opts: { exercises: string[]; foods: string[] }): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Train with Jaime";
  wb.created = new Date();

  // ── Instrucciones ──
  const help = wb.addWorksheet("Instrucciones", { properties: { tabColor: { argb: ACCENT } } });
  help.getColumn(1).width = 110;
  const lines: [string, "h1" | "h2" | "p"][] = [
    ["Plantilla de rutinas y dietas · Train with Jaime", "h1"],
    ["Cómo se usa", "h2"],
    ["1. Rellena la pestaña «Entreno» (una fila por ejercicio) y/o la pestaña «Dieta» (una fila por alimento).", "p"],
    ["2. No cambies el nombre de las pestañas ni de las columnas: así la plataforma lo lee a la primera.", "p"],
    ["3. En el panel: Biblioteca → Importar desde Excel → sube el archivo y elige el cliente (o «plantilla»).", "p"],
    ["4. Antes de guardar verás un resumen y, si algo falla, en qué fila y por qué. Todo entra como borrador.", "p"],
    ["Entreno", "h2"],
    [
      "• Bloque, Semana, Sesión y Ejercicio son obligatorios. Las filas con el mismo Bloque + Semana + Sesión forman una sesión.",
      "p",
    ],
    ["• Día: Lunes…Domingo (opcional). Semana: 1, 2, 3… dentro del bloque.", "p"],
    ["• Modalidad: gym, funcional, running o hyrox (vacío = gym). Formato según la modalidad:", "p"],
    ["     gym → series, superserie, circuito · funcional → amrap, emom, for time, tabata, rondas, circuito", "p"],
    ["     running → carrera · hyrox → estaciones, simulacro, for time, rondas", "p"],
    [
      "• Reps admite rangos (8-10) o «al fallo». Descanso, Duración y Ritmos en m:ss (1:30, 5:15). Carga en kg, RPE de 0 a 10.",
      "p",
    ],
    [
      "• Ejercicio: elige de la lista (tu biblioteca, con su vídeo). Si escribes uno nuevo, entra sin vídeo y lo enlazas luego.",
      "p",
    ],
    ["Dieta", "h2"],
    ["• Día, Comida y Alimento son obligatorios, y la cantidad en gramos o en unidades (por ejemplo 2 huevos).", "p"],
    ["• Comida: Desayuno, Media mañana, Comida, Merienda, Cena, Pre entreno, Post entreno o Extra.", "p"],
    [
      "• Plato (opcional) agrupa alimentos: mismo Día + Comida + Plato = un plato. Semana: 1 si es un menú de una semana.",
      "p",
    ],
    [
      "• Alimento: elige de la lista (tu base, con sus macros). Si escribes uno nuevo, se crea sin datos y los completas en Alimentos.",
      "p",
    ],
    ["Ejemplos", "h2"],
    [
      "Mira las pestañas «Ejemplo entreno» y «Ejemplo dieta»: así queda bien rellenado. Esas pestañas no se importan.",
      "p",
    ],
  ];
  for (const [text, kind] of lines) {
    if (kind === "h2") help.addRow([]);
    const r = help.addRow([text]);
    if (kind === "h1") {
      r.font = { bold: true, size: 16, color: { argb: BRAND } };
      r.height = 26;
    }
    if (kind === "h2") r.font = { bold: true, size: 12, color: { argb: ACCENT } };
  }

  // Valores de los desplegables (van en la pestaña oculta «Listas», al final)
  const columns: [string, string[]][] = [
    ["Días", DAYS],
    ["Modalidades", MODALITIES],
    ["Formatos", FORMATS],
    ["Comidas", SLOT_CHOICES],
    ["Ejercicios", [...new Set(opts.exercises)].sort((a, b) => a.localeCompare(b, "es"))],
    ["Alimentos", [...new Set(opts.foods)].sort((a, b) => a.localeCompare(b, "es"))],
  ];
  const range = (i: number) => {
    const col = String.fromCharCode(65 + i);
    const n = Math.max(columns[i]![1].length, 1);
    return `Listas!$${col}$2:$${col}$${n + 1}`;
  };

  // ── Entreno ──
  const tr = wb.addWorksheet(TRAINING_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { tabColor: { argb: BRAND } },
  });
  tr.columns = TEMPLATE_HEADERS.map((h) => ({
    header: h,
    key: h,
    width:
      h === "Ejercicio" ? 30 : h === "Notas" ? 34 : h === "Bloque" || h === "Sesión" ? 22 : Math.max(13, h.length + 3),
  }));
  styleHeader(tr.getRow(1));
  const tcol = (h: string) => TEMPLATE_HEADERS.indexOf(h) + 1;
  asText(
    tr,
    ["Reps", "Descanso", "Tempo", "Duración", "Ritmo mín (/km)", "Ritmo máx (/km)", "Zona FC", "Semana"].map(tcol),
  );
  dropdown(tr, tcol("Día"), range(0), true, "");
  dropdown(tr, tcol("Modalidad"), range(1), true, "gym, funcional, running o hyrox");
  dropdown(tr, tcol("Formato"), range(2), true, "");
  if (opts.exercises.length) dropdown(tr, tcol("Ejercicio"), range(4), false, "");

  // ── Dieta ──
  const di = wb.addWorksheet(DIET_SHEET, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { tabColor: { argb: "FF2E9E5B" } },
  });
  di.columns = DIET_HEADERS.map((h) => ({
    header: h,
    key: h,
    width: h === "Alimento" ? 32 : h === "Plato" ? 26 : h === "Notas" ? 30 : Math.max(13, h.length + 3),
  }));
  styleHeader(di.getRow(1));
  const dcol = (h: string) => (DIET_HEADERS as readonly string[]).indexOf(h) + 1;
  asText(di, [dcol("Semana")]);
  dropdown(di, dcol("Día"), range(0), true, "");
  dropdown(di, dcol("Comida"), range(3), true, "");
  if (opts.foods.length) dropdown(di, dcol("Alimento"), range(5), false, "");

  // ── Ejemplos (no se importan: la plataforma solo lee «Entreno» y «Dieta») ──
  const example = (
    name: string,
    headers: readonly string[],
    rows: Record<string, string>[],
    widths: (h: string) => number,
  ) => {
    const ws = wb.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { tabColor: { argb: "FFB0B7C3" } },
    });
    ws.columns = headers.map((h) => ({ header: h, key: h, width: widths(h) }));
    styleHeader(ws.getRow(1));
    for (const row of rows) ws.addRow(headers.map((k) => row[k] ?? ""));
  };
  example("Ejemplo entreno", TEMPLATE_HEADERS, TEMPLATE_ROWS, (h) =>
    h === "Ejercicio" ? 30 : h === "Notas" ? 34 : h === "Bloque" || h === "Sesión" ? 22 : Math.max(13, h.length + 3),
  );
  example("Ejemplo dieta", DIET_HEADERS, DIET_EXAMPLE_ROWS, (h) =>
    h === "Alimento" ? 32 : h === "Plato" ? 26 : h === "Notas" ? 30 : Math.max(13, h.length + 3),
  );

  // ── Listas (oculta, al final): valores de los desplegables ──
  const lists = wb.addWorksheet("Listas", { state: "hidden" });
  columns.forEach(([title, values], i) => {
    lists.getCell(1, i + 1).value = title;
    values.forEach((v, j) => (lists.getCell(j + 2, i + 1).value = v));
  });

  // Abre en «Entreno»
  wb.views = [{ x: 0, y: 0, width: 20000, height: 12000, firstSheet: 0, activeTab: 1, visibility: "visible" }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
