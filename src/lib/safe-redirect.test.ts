import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("acepta rutas internas", () => {
    expect(safeNextPath("/hoy?x=1")).toBe("/hoy?x=1");
  });
  it("rechaza URLs externas y protocol-relative", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
  });
  it("usa el fallback si no hay valor", () => {
    expect(safeNextPath(null, "/panel")).toBe("/panel");
  });
});
