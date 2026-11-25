import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ConsentPdfBlock } from "@/domain/minors/consent";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const BRAND = rgb(0.043, 0.122, 0.227); // azul TWJ
const MUTED = rgb(0.38, 0.42, 0.48);

/** Las fuentes estándar de PDF solo tienen el juego WinAnsi: el resto se sustituye. */
function safeText(font: PDFFont, text: string) {
  const supported = new Set(font.getCharacterSet());
  return [...text.replace(/→/g, "->").replace(/[‘’]/g, "'").replace(/\t/g, " ")]
    .map((ch) => (supported.has(ch.codePointAt(0)!) ? ch : "?"))
    .join("");
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = safeText(font, text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** PDF A4 de la autorización del tutor, listo para imprimir y firmar. */
export async function renderGuardianConsentPdf(blocks: ConsentPdfBlock[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Autorización del padre, madre o tutor legal · Train with Jaime");
  pdf.setAuthor("Train with Jaime");
  pdf.setLanguage("es-ES");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = A4[0] - MARGIN * 2;

  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - MARGIN;
  const ensure = (h: number) => {
    if (y - h < MARGIN + 30) {
      page = pdf.addPage(A4);
      y = A4[1] - MARGIN;
    }
  };
  const text = (lines: string[], font: PDFFont, size: number, color = rgb(0, 0, 0), x = MARGIN, gap = 1.35) => {
    for (const l of lines) {
      ensure(size * gap);
      page.drawText(l, { x, y: y - size, size, font, color });
      y -= size * gap;
    }
  };

  let footer = "";
  for (const b of blocks) {
    switch (b.type) {
      case "title":
        text(wrap(bold, b.text, 18, width), bold, 18, BRAND);
        y -= 2;
        break;
      case "subtitle":
        text(wrap(regular, b.text, 10, width), regular, 10, MUTED);
        y -= 8;
        break;
      case "heading":
        y -= 8;
        ensure(26);
        text(wrap(bold, b.text, 12, width), bold, 12, BRAND);
        page.drawLine({
          start: { x: MARGIN, y: y + 2 },
          end: { x: MARGIN + width, y: y + 2 },
          thickness: 0.5,
          color: MUTED,
        });
        y -= 6;
        break;
      case "field": {
        const label = `${b.label}: `;
        const lw = bold.widthOfTextAtSize(safeText(bold, label), 10);
        const lines = wrap(regular, b.value, 10, width - lw);
        ensure(16);
        page.drawText(safeText(bold, label), { x: MARGIN, y: y - 10, size: 10, font: bold });
        lines.forEach((l, i) => {
          if (i > 0) ensure(14);
          page.drawText(l, { x: MARGIN + lw, y: y - 10, size: 10, font: regular });
          y -= 16;
        });
        break;
      }
      case "paragraph":
        text(wrap(regular, b.text, 10, width), regular, 10);
        y -= 6;
        break;
      case "bullet": {
        const lines = wrap(regular, b.text, 10, width - 14);
        ensure(14);
        page.drawText("•", { x: MARGIN + 2, y: y - 10, size: 10, font: regular });
        text(lines, regular, 10, rgb(0, 0, 0), MARGIN + 14);
        y -= 2;
        break;
      }
      case "notice": {
        const lines = wrap(bold, b.text, 10, width - 20);
        const h = lines.length * 13.5 + 16;
        ensure(h);
        page.drawRectangle({
          x: MARGIN,
          y: y - h,
          width,
          height: h,
          borderColor: rgb(0.8, 0.2, 0.2),
          borderWidth: 1,
          color: rgb(1, 0.95, 0.95),
        });
        y -= 8;
        text(lines, bold, 10, rgb(0.6, 0.1, 0.1), MARGIN + 10);
        y -= 10;
        break;
      }
      case "signature":
        y -= 40;
        ensure(60);
        page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 240, y }, thickness: 0.8, color: rgb(0, 0, 0) });
        y -= 14;
        page.drawText(safeText(regular, b.label), { x: MARGIN, y, size: 9, font: regular, color: MUTED });
        y -= 10;
        break;
      case "footer":
        footer = b.text;
        break;
    }
  }

  if (footer) {
    const pages = pdf.getPages();
    pages.forEach((p, i) => {
      const t = safeText(regular, `${footer} · página ${i + 1} de ${pages.length}`);
      for (const [k, l] of wrap(regular, t, 7.5, width).entries())
        p.drawText(l, { x: MARGIN, y: MARGIN - 14 - k * 10, size: 7.5, font: regular, color: MUTED });
    });
  }
  return pdf.save();
}
