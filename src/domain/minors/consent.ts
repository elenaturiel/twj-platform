import { ageOn } from "@/domain/onboarding/rules";

/**
 * Autorización del padre, madre o tutor legal para entrenar a un menor.
 * Estados: no hace falta · falta el documento · enviado (Jaime lo revisa) · aprobada.
 */
export type GuardianConsentState = "not_required" | "awaiting_document" | "in_review" | "confirmed";

export function guardianConsentState(
  guardianStatus: "not_required" | "pending" | "confirmed",
  hasSignedDocument: boolean,
): GuardianConsentState {
  if (guardianStatus === "not_required") return "not_required";
  if (guardianStatus === "confirmed") return "confirmed";
  return hasSignedDocument ? "in_review" : "awaiting_document";
}

export type ConsentPdfData = {
  minor: { name: string; birthDate: string | null; email: string; phone: string | null };
  guardian: { name: string | null; email: string | null };
  planName: string | null;
  /** Texto publicado en Textos legales → «Autorización de tutor (menores)» (markdown) */
  legal: { body: string; version: string } | null;
  today: string; // YYYY-MM-DD (Madrid)
  reference: string;
};

export type ConsentPdfBlock =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "heading"; text: string }
  | { type: "field"; label: string; value: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string }
  | { type: "notice"; text: string }
  | { type: "signature"; label: string }
  | { type: "footer"; text: string };

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};
const blank = "______________________________";

/** Markdown sencillo (el de Textos legales) → bloques de párrafo y viñetas, sin marcas. */
export function legalMarkdownToBlocks(md: string): ConsentPdfBlock[] {
  const out: ConsentPdfBlock[] = [];
  let para: string[] = [];
  const clean = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\((.+?)\)/g, "$1 ($2)")
      .trim();
  const flush = () => {
    if (para.length) out.push({ type: "paragraph", text: clean(para.join(" ")) });
    para = [];
  };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = line.match(/^#{1,6}\s+(.*)$/);
    const b = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (h) {
      flush();
      out.push({ type: "heading", text: clean(h[1]!) });
    } else if (b) {
      flush();
      out.push({ type: "bullet", text: clean(b[1]!) });
    } else para.push(line);
  }
  flush();
  return out;
}

/** Contenido del PDF: datos rellenos + el texto legal publicado + firmas. */
export function buildGuardianConsentBlocks(d: ConsentPdfData): ConsentPdfBlock[] {
  const age = d.minor.birthDate ? ageOn(d.minor.birthDate, d.today) : null;
  const blocks: ConsentPdfBlock[] = [
    { type: "title", text: "Autorización del padre, madre o tutor legal" },
    { type: "subtitle", text: "Train with Jaime · entrenamiento personal online" },
    { type: "heading", text: "Datos del menor" },
    { type: "field", label: "Nombre y apellidos", value: d.minor.name },
    {
      type: "field",
      label: "Fecha de nacimiento",
      value: d.minor.birthDate ? `${fmtDate(d.minor.birthDate)}${age !== null ? ` (${age} años)` : ""}` : blank,
    },
    { type: "field", label: "Email", value: d.minor.email },
    { type: "field", label: "Teléfono", value: d.minor.phone ?? blank },
    { type: "field", label: "Plan", value: d.planName ?? blank },
    { type: "heading", text: "Datos del padre, madre o tutor legal" },
    { type: "field", label: "Nombre y apellidos", value: d.guardian.name ?? blank },
    { type: "field", label: "DNI / NIE", value: blank },
    { type: "field", label: "Relación con el menor", value: blank },
    { type: "field", label: "Email", value: d.guardian.email ?? blank },
    { type: "field", label: "Teléfono", value: blank },
    { type: "heading", text: "Autorización" },
  ];
  if (d.legal?.body.trim()) blocks.push(...legalMarkdownToBlocks(d.legal.body));
  else
    blocks.push({
      type: "notice",
      text: "Falta el texto de la autorización. Jaime tiene que publicarlo en Panel → Ajustes → Textos legales → «Autorización de tutor (menores)» antes de usar este documento.",
    });
  blocks.push(
    { type: "field", label: "Lugar y fecha", value: blank },
    { type: "signature", label: "Firma del padre, madre o tutor legal" },
    {
      type: "footer",
      text: `Ref. ${d.reference} · generado el ${fmtDate(d.today)}${d.legal ? ` · texto legal v${d.legal.version}` : ""} · Súbelo firmado en la app o mándaselo a Jaime.`,
    },
  );
  return blocks;
}
