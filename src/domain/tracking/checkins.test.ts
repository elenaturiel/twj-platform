import { describe, expect, it } from "vitest";
import { checkinDueOn, checkinReminderDue, isCheckinMissed } from "./checkins";

describe("calendario de check-ins", () => {
  // 2026-11-02 es lunes; weekday 6 = domingo
  it("primer check-in: el primer domingo tras 3 días del alta", () => {
    expect(
      checkinDueOn({ lastDueOn: null, startedOn: "2026-11-02", frequencyDays: 7, weekday: 6, today: "2026-11-07" }),
    ).toBeNull();
    expect(
      checkinDueOn({ lastDueOn: null, startedOn: "2026-11-02", frequencyDays: 7, weekday: 6, today: "2026-11-08" }),
    ).toBe("2026-11-08");
  });
  it("si se apunta un sábado, el primero no es al día siguiente", () => {
    expect(
      checkinDueOn({ lastDueOn: null, startedOn: "2026-11-07", frequencyDays: 7, weekday: 6, today: "2026-11-08" }),
    ).toBeNull();
    expect(
      checkinDueOn({ lastDueOn: null, startedOn: "2026-11-07", frequencyDays: 7, weekday: 6, today: "2026-11-15" }),
    ).toBe("2026-11-15");
  });
  it("semanal y quincenal", () => {
    expect(
      checkinDueOn({
        lastDueOn: "2026-11-08",
        startedOn: "2026-11-02",
        frequencyDays: 7,
        weekday: 6,
        today: "2026-11-14",
      }),
    ).toBeNull();
    expect(
      checkinDueOn({
        lastDueOn: "2026-11-08",
        startedOn: "2026-11-02",
        frequencyDays: 7,
        weekday: 6,
        today: "2026-11-15",
      }),
    ).toBe("2026-11-15");
    expect(
      checkinDueOn({
        lastDueOn: "2026-11-08",
        startedOn: "2026-11-02",
        frequencyDays: 14,
        weekday: 6,
        today: "2026-11-15",
      }),
    ).toBeNull();
    expect(
      checkinDueOn({
        lastDueOn: "2026-11-08",
        startedOn: "2026-11-02",
        frequencyDays: 14,
        weekday: 6,
        today: "2026-11-22",
      }),
    ).toBe("2026-11-22");
  });
  it("si se saltó varios, solo crea el más reciente", () => {
    expect(
      checkinDueOn({
        lastDueOn: "2026-10-04",
        startedOn: "2026-09-01",
        frequencyDays: 7,
        weekday: 6,
        today: "2026-11-10",
      }),
    ).toBe("2026-11-08");
  });
  it("recordatorio y perdido", () => {
    expect(checkinReminderDue("2026-11-08", "2026-11-09")).toBe(true);
    expect(checkinReminderDue("2026-11-08", "2026-11-10")).toBe(false);
    expect(isCheckinMissed("2026-11-08", "2026-11-15")).toBe(false);
    expect(isCheckinMissed("2026-11-08", "2026-11-16")).toBe(true);
  });
});
