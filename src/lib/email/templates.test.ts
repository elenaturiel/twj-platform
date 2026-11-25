import { describe, expect, it } from "vitest";
import { fillTemplate, toParagraphs } from "./templates";

describe("fillTemplate", () => {
  it("sustituye variables y deja vacías las desconocidas", () => {
    expect(fillTemplate("Hola {{nombre}}, plan {{ plan }} {{x}}", { nombre: "Ana", plan: "MVP" })).toBe(
      "Hola Ana, plan MVP ",
    );
  });
});

describe("toParagraphs", () => {
  it("separa por líneas en blanco, también con \\n escapado de la BD", () => {
    expect(toParagraphs("Hola:\\n\\nTexto\nsigue\n\nAdiós")).toEqual(["Hola:", "Texto\nsigue", "Adiós"]);
  });
});
