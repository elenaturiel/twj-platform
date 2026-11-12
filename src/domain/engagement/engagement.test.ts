import { describe, expect, it } from "vitest";
import {
  bestTrainingStreak,
  challengeProgress,
  checkinStreak,
  milestoneBadges,
  parseRule,
  progressPct,
  trainingStreak,
} from "./engagement";

const W = (weekStart: string, planned: number, done: number) => ({ weekStart, planned, done });

describe("racha de entreno (semanas ≥ 80 %)", () => {
  it("cuenta semanas seguidas cumplidas", () => {
    const weeks = [W("2026-10-12", 4, 4), W("2026-10-19", 5, 4), W("2026-10-26", 5, 4), W("2026-11-02", 4, 4)];
    expect(trainingStreak(weeks, "2026-11-09")).toBe(4);
  });
  it("una semana floja la rompe", () => {
    const weeks = [W("2026-10-19", 4, 4), W("2026-10-26", 4, 2), W("2026-11-02", 4, 4)];
    expect(trainingStreak(weeks, "2026-11-09")).toBe(1);
  });
  it("la semana en curso a medias no rompe; cumplida suma", () => {
    const weeks = [W("2026-11-02", 4, 4), W("2026-11-09", 4, 1)];
    expect(trainingStreak(weeks, "2026-11-09")).toBe(1);
    expect(trainingStreak([W("2026-11-02", 4, 4), W("2026-11-09", 4, 4)], "2026-11-09")).toBe(2);
  });
  it("las semanas sin plan (vacaciones) no rompen", () => {
    const weeks = [W("2026-10-19", 3, 3), W("2026-10-26", 0, 0), W("2026-11-02", 3, 3)];
    expect(trainingStreak(weeks, "2026-11-09")).toBe(2);
  });
  it("mejor racha histórica", () => {
    expect(
      bestTrainingStreak([W("2026-09-07", 3, 3), W("2026-09-14", 3, 3), W("2026-09-21", 3, 0), W("2026-09-28", 3, 3)]),
    ).toBe(2);
  });
});

describe("racha de check-ins", () => {
  it("cuenta los entregados a tiempo y no rompe con el pendiente de hoy", () => {
    const c = [
      { dueOn: "2026-11-08", status: "pending", submittedAt: null },
      { dueOn: "2026-11-01", status: "reviewed", submittedAt: "2026-11-01T19:00:00Z" },
      { dueOn: "2026-10-25", status: "submitted", submittedAt: "2026-10-26T10:00:00Z" },
      { dueOn: "2026-10-18", status: "missed", submittedAt: null },
    ];
    expect(checkinStreak(c, "2026-11-08")).toBe(2);
  });
  it("entregado tarde rompe", () => {
    expect(
      checkinStreak([{ dueOn: "2026-11-01", status: "submitted", submittedAt: "2026-11-04T10:00:00Z" }], "2026-11-08"),
    ).toBe(0);
  });
});

describe("medallas y retos", () => {
  it("hitos según totales", () => {
    expect(milestoneBadges({ workouts: 12, prs: 1, trainingWeeks: 4, checkinStreak: 0, liveSessions: 0 })).toEqual([
      "first_workout",
      "workouts_10",
      "first_pr",
      "streak_4",
    ]);
  });
  it("progreso del reto según la regla", () => {
    const d = { workouts: 7, checkins: 2, prs: 1, liveSessions: 0, metricTotals: { steps: 123456.789 } };
    expect(challengeProgress({ type: "workouts_count", target: 12 }, d)).toBe(7);
    expect(challengeProgress({ type: "metric_total", target: 300000, metric: "steps" }, d)).toBe(123456.79);
    expect(progressPct(7, 12)).toBe(58);
    expect(progressPct(20, 12)).toBe(100);
  });
  it("valida reglas", () => {
    expect(parseRule({ type: "workouts_count", target: "12" })).toEqual({ type: "workouts_count", target: 12 });
    expect(parseRule({ type: "metric_total", target: 5 })).toBeNull();
    expect(parseRule({ type: "otro", target: 5 })).toBeNull();
  });
});
