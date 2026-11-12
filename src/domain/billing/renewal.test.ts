import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonthsAnchored,
  billingPeriod,
  diffDays,
  manualStatusOn,
  nextManualPeriod,
  reminderDue,
} from "./renewal";

describe("addMonthsAnchored", () => {
  it("mes normal", () => {
    expect(addMonthsAnchored("2026-10-15", 1)).toBe("2026-11-15");
  });
  it("31 de enero → 28 de febrero → 31 de marzo (conserva el anclaje)", () => {
    const feb = addMonthsAnchored("2026-01-31", 1, 31);
    expect(feb).toBe("2026-02-28");
    expect(addMonthsAnchored(feb, 1, 31)).toBe("2026-03-31");
  });
  it("año bisiesto", () => {
    expect(addMonthsAnchored("2028-01-30", 1, 30)).toBe("2028-02-29");
  });
  it("cruza de año", () => {
    expect(addMonthsAnchored("2026-12-10", 1)).toBe("2027-01-10");
    expect(addMonthsAnchored("2026-10-26", 12)).toBe("2027-10-26");
  });
});

describe("billingPeriod", () => {
  it("mensual y anual", () => {
    expect(billingPeriod("2026-10-26", "month")).toEqual({ start: "2026-10-26", end: "2026-11-26" });
    expect(billingPeriod("2026-10-26", "year")).toEqual({ start: "2026-10-26", end: "2027-10-26" });
  });
});

describe("nextManualPeriod", () => {
  it("primer pago: empieza el día del pago", () => {
    expect(nextManualPeriod({ previousEnd: null, paidOn: "2026-10-26", interval: "month" })).toEqual({
      start: "2026-10-26",
      end: "2026-11-26",
    });
  });
  it("paga tarde (en gracia): el periodo sigue donde acabó el anterior", () => {
    expect(
      nextManualPeriod({ previousEnd: "2026-10-20", paidOn: "2026-10-24", interval: "month", anchorDay: 20 }),
    ).toEqual({ start: "2026-10-20", end: "2026-11-20" });
  });
  it("paga antes de tiempo: tampoco pierde días", () => {
    expect(
      nextManualPeriod({ previousEnd: "2026-11-20", paidOn: "2026-11-15", interval: "month", anchorDay: 20 }),
    ).toEqual({ start: "2026-11-20", end: "2026-12-20" });
  });
  it("vuelve tras mucho tiempo: reengancha desde el día del pago", () => {
    expect(nextManualPeriod({ previousEnd: "2026-06-01", paidOn: "2026-10-26", interval: "month" })).toEqual({
      start: "2026-10-26",
      end: "2026-11-26",
    });
  });
});

describe("manualStatusOn", () => {
  it("al día antes del vencimiento", () => {
    expect(manualStatusOn({ periodEnd: "2026-11-01", today: "2026-10-31", graceDays: 5 })).toEqual({
      status: "active",
      graceUntil: null,
    });
  });
  it("el día del vencimiento pasa a past_due con gracia", () => {
    expect(manualStatusOn({ periodEnd: "2026-11-01", today: "2026-11-01", graceDays: 5 })).toEqual({
      status: "past_due",
      graceUntil: "2026-11-06",
      accessBlocked: false,
    });
  });
  it("tras la gracia se bloquea el acceso", () => {
    expect(manualStatusOn({ periodEnd: "2026-11-01", today: "2026-11-07", graceDays: 5 })).toMatchObject({
      accessBlocked: true,
    });
  });
});

describe("reminderDue", () => {
  it("avisa solo en los días configurados", () => {
    const offsets = [-3, 0, 3];
    expect(reminderDue({ periodEnd: "2026-11-01", today: "2026-10-29", offsets })).toBe(-3);
    expect(reminderDue({ periodEnd: "2026-11-01", today: "2026-11-01", offsets })).toBe(0);
    expect(reminderDue({ periodEnd: "2026-11-01", today: "2026-11-04", offsets })).toBe(3);
    expect(reminderDue({ periodEnd: "2026-11-01", today: "2026-10-30", offsets })).toBeNull();
  });
});

describe("utilidades de fecha", () => {
  it("addDays y diffDays", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(diffDays("2026-10-26", "2026-11-26")).toBe(31);
  });
});
