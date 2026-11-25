import { describe, expect, it } from "vitest";
import { canCancelFree, creditWindow, madridInstant, madridParts, slotsForDay, type SlotType } from "./slots";

const type: SlotType = {
  key: "live_training",
  duration_min: 60,
  buffer_min: 15,
  min_notice_h: 24,
  available_from: null,
};
const rules = [{ weekday: 0, start_time: "18:00", end_time: "21:00", type_keys: [], is_active: true }];
const now = new Date("2026-11-01T10:00:00Z"); // domingo
const MONDAY = "2026-11-09";
const times = (ds: Date[]) => ds.map((d) => madridParts(d).time);

describe("madridInstant", () => {
  it("respeta el horario de invierno y de verano", () => {
    expect(madridInstant("2026-11-09", "18:00").toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(madridInstant("2026-07-06", "18:00").toISOString()).toBe("2026-07-06T16:00:00.000Z");
  });
});

describe("slotsForDay", () => {
  it("genera huecos cada 30 min que caben enteros en la franja", () => {
    const s = slotsForDay({ date: MONDAY, type, rules, exceptions: [], busy: [], now });
    expect(times(s)).toEqual(["18:00", "18:30", "19:00", "19:30", "20:00"]);
  });

  it("no da huecos otro día de la semana", () => {
    expect(slotsForDay({ date: "2026-11-10", type, rules, exceptions: [], busy: [], now })).toEqual([]);
  });

  it("respeta citas ocupadas con su margen", () => {
    const busy = [{ starts_at: "2026-11-09T17:00:00Z", ends_at: "2026-11-09T18:00:00Z" }]; // 18-19 h Madrid
    const s = slotsForDay({ date: MONDAY, type, rules, exceptions: [], busy, now });
    expect(times(s)).toEqual(["19:30", "20:00"]);
  });

  it("respeta bloqueos (vacaciones) y añade huecos extra", () => {
    const exceptions = [
      { starts_at: "2026-11-09T17:00:00Z", ends_at: "2026-11-09T19:00:00Z", kind: "blocked" as const },
      { starts_at: "2026-11-09T09:00:00Z", ends_at: "2026-11-09T10:00:00Z", kind: "extra" as const },
    ];
    const s = slotsForDay({ date: MONDAY, type, rules, exceptions, busy: [], now });
    expect(times(s)).toEqual(["10:00", "20:00"]);
  });

  it("aplica la antelación mínima", () => {
    const close = new Date("2026-11-08T18:00:00Z"); // 19 h del domingo en Madrid
    expect(times(slotsForDay({ date: MONDAY, type, rules, exceptions: [], busy: [], now: close }))).toEqual([
      "19:00",
      "19:30",
      "20:00",
    ]);
  });

  it("no ofrece presenciales antes de su fecha de inicio", () => {
    const inPerson = { ...type, key: "in_person", available_from: "2027-01-01" };
    expect(slotsForDay({ date: MONDAY, type: inPerson, rules, exceptions: [], busy: [], now })).toEqual([]);
  });

  it("filtra franjas reservadas a otros tipos", () => {
    const only = [{ ...rules[0]!, type_keys: ["monthly_call"] }];
    expect(slotsForDay({ date: MONDAY, type, rules: only, exceptions: [], busy: [], now })).toEqual([]);
  });
});

describe("créditos y cancelación", () => {
  it("cancelar gratis hasta 12 h antes", () => {
    expect(canCancelFree("2026-11-09T17:00:00Z", 12, new Date("2026-11-09T05:00:00Z"))).toBe(true);
    expect(canCancelFree("2026-11-09T17:00:00Z", 12, new Date("2026-11-09T05:01:00Z"))).toBe(false);
  });

  it("ventana mensual anclada al día de pago (también en cuotas anuales)", () => {
    expect(creditWindow("2026-01-31", "2026-03-05")).toEqual({ start: "2026-02-28", end: "2026-03-31" });
    expect(creditWindow("2026-10-15", "2026-10-15")).toEqual({ start: "2026-10-15", end: "2026-11-15" });
    expect(creditWindow("2026-01-10", "2026-12-20")).toEqual({ start: "2026-12-10", end: "2027-01-10" });
  });
});
