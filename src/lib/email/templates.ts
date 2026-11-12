/** Sustituye {{variable}} por su valor. Las variables desconocidas se dejan vacías. */
export function fillTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

/** Separa un cuerpo de texto en párrafos (línea en blanco = párrafo nuevo). */
export function toParagraphs(body: string): string[] {
  return body
    .replace(/\\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
