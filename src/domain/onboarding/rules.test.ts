import { describe, expect, it } from "vitest";
import { ageOn, healthScreeningHasFlags, isMinor } from "./rules";

describe("ageOn / isMinor", () => {
  it("cuenta el cumpleaños exacto", () => {
    expect(ageOn("2008-10-26", "2026-10-26")).toBe(18);
    expect(ageOn("2008-10-27", "2026-10-26")).toBe(17);
    expect(isMinor("2008-10-27", "2026-10-26")).toBe(true);
    expect(isMinor("2008-10-26", "2026-10-26")).toBe(false);
  });
  it("29 de febrero", () => {
    expect(ageOn("2008-02-29", "2026-02-28")).toBe(17);
    expect(ageOn("2008-02-29", "2026-03-01")).toBe(18);
  });
});

describe("healthScreeningHasFlags", () => {
  it("marca si hay algún sí", () => {
    expect(healthScreeningHasFlags({ a: { answer: false }, b: { answer: false } })).toBe(false);
    expect(healthScreeningHasFlags({ a: { answer: false }, b: { answer: true } })).toBe(true);
  });
});
