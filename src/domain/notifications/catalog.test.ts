import { describe, expect, it } from "vitest";
import { effectivePreference, typesFor } from "./catalog";

describe("preferencias de avisos", () => {
  it("por defecto todo activado y al momento", () => {
    expect(effectivePreference([], "chat_message", "email")).toEqual({ enabled: true, digest: false });
  });
  it("la preferencia concreta gana al comodín", () => {
    const rows = [
      { type: "*", channel: "email" as const, enabled: false, digest: false },
      { type: "chat_message", channel: "email" as const, enabled: true, digest: true },
    ];
    expect(effectivePreference(rows, "chat_message", "email")).toEqual({ enabled: true, digest: true });
    expect(effectivePreference(rows, "menu_published", "email").enabled).toBe(false);
  });
  it("cada público tiene sus tipos sin repetir", () => {
    for (const a of ["client", "staff"] as const) {
      const t = typesFor(a).map((x) => x.type);
      expect(new Set(t).size).toBe(t.length);
    }
  });
});
