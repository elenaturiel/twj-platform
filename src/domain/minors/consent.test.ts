import { describe, expect, it } from "vitest";
import { buildGuardianConsentBlocks, guardianConsentState, legalMarkdownToBlocks } from "./consent";

describe("guardianConsentState", () => {
  it("distingue los cuatro estados", () => {
    expect(guardianConsentState("not_required", false)).toBe("not_required");
    expect(guardianConsentState("pending", false)).toBe("awaiting_document");
    expect(guardianConsentState("pending", true)).toBe("in_review");
    expect(guardianConsentState("confirmed", true)).toBe("confirmed");
  });
});

describe("legalMarkdownToBlocks", () => {
  it("quita las marcas y separa títulos, párrafos y viñetas", () => {
    expect(
      legalMarkdownToBlocks("## Qué autorizo\n\nQue **mi hijo** entrene\ncon Jaime.\n\n- Online\n1. Con supervisión"),
    ).toEqual([
      { type: "heading", text: "Qué autorizo" },
      { type: "paragraph", text: "Que mi hijo entrene con Jaime." },
      { type: "bullet", text: "Online" },
      { type: "bullet", text: "Con supervisión" },
    ]);
  });
});

describe("buildGuardianConsentBlocks", () => {
  const base = {
    minor: { name: "Lucía Pérez", birthDate: "2010-03-05", email: "lucia@x.es", phone: null },
    guardian: { name: "Ana Pérez", email: "ana@x.es" },
    planName: "Rookie",
    today: "2026-11-12",
    reference: "abc123",
  };

  it("rellena los datos del menor y del tutor y deja huecos para lo que se escribe a mano", () => {
    const b = buildGuardianConsentBlocks({ ...base, legal: { body: "Autorizo a mi hijo/a.", version: "1.0" } });
    const fields = Object.fromEntries(b.filter((x) => x.type === "field").map((x) => [x.label, x.value]));
    expect(fields["Fecha de nacimiento"]).toBe("05/03/2010 (16 años)");
    expect(fields["Plan"]).toBe("Rookie");
    expect(b).toContainEqual({ type: "field", label: "Nombre y apellidos", value: "Ana Pérez" });
    expect(fields["DNI / NIE"]).toMatch(/^_+$/);
    expect(b).toContainEqual({ type: "paragraph", text: "Autorizo a mi hijo/a." });
    expect(b.some((x) => x.type === "signature")).toBe(true);
    expect(b.at(-1)).toMatchObject({ type: "footer", text: expect.stringContaining("texto legal v1.0") });
  });

  it("si no hay texto legal publicado, no se lo inventa: avisa", () => {
    const b = buildGuardianConsentBlocks({ ...base, legal: null });
    expect(b.find((x) => x.type === "notice")?.text).toContain("Textos legales");
    expect(b.some((x) => x.type === "paragraph")).toBe(false);
  });
});
