import { describe, expect, it } from "vitest";
import { currentWeekIndex, sessionDate, weekdayMondayFirst } from "./week";

describe("semanas del bloque", () => {
  it("lunes = 0, domingo = 6", () => {
    expect(weekdayMondayFirst("2026-11-09")).toBe(0); // lunes
    expect(weekdayMondayFirst("2026-11-08")).toBe(6); // domingo
  });
  it("semana actual", () => {
    expect(currentWeekIndex("2026-11-02", "2026-11-08")).toBe(0);
    expect(currentWeekIndex("2026-11-02", "2026-11-09")).toBe(1);
    expect(currentWeekIndex("2026-11-10", "2026-11-09")).toBeNull();
    expect(currentWeekIndex(null, "2026-11-09")).toBeNull();
  });
  it("fecha de una sesión", () => {
    expect(sessionDate("2026-11-02", 1, 2)).toBe("2026-11-11");
    expect(sessionDate("2026-11-02", 0, null)).toBeNull();
  });
});
