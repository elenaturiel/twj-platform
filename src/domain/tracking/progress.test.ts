import { describe, expect, it } from "vitest";
import { adherencePercent, progressToTarget, seriesChange } from "./progress";

describe("progreso", () => {
  it("hacia un objetivo que baja (cintura 90 → 80)", () => {
    expect(progressToTarget(90, 85, 80)).toBe(50);
    expect(progressToTarget(90, 92, 80)).toBe(0);
    expect(progressToTarget(90, 78, 80)).toBe(100);
  });
  it("hacia un objetivo que sube (pasos 6000 → 10000)", () => {
    expect(progressToTarget(6000, 9000, 10000)).toBe(75);
  });
  it("sin datos", () => {
    expect(progressToTarget(null, 80, 70)).toBeNull();
  });
  it("adherencia", () => {
    expect(adherencePercent(6, 5)).toBe(83);
    expect(adherencePercent(0, 0)).toBeNull();
    expect(adherencePercent(3, 4)).toBe(100);
  });
  it("variación de una serie", () => {
    expect(seriesChange([{ value: 80 }, { value: 78.5 }])).toEqual({ absolute: -1.5, percent: -1.9 });
    expect(seriesChange([{ value: 80 }])).toBeNull();
  });
});
