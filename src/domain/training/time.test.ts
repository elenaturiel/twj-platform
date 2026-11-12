import { describe, expect, it } from "vitest";
import { formatDuration, formatPace, paceSecondsPerKm, parseDuration } from "./time";

describe("duraciones y ritmos", () => {
  it("parsea formatos habituales", () => {
    expect(parseDuration("4:30")).toBe(270);
    expect(parseDuration("1:02:15")).toBe(3735);
    expect(parseDuration("90")).toBe(90);
    expect(parseDuration("4:75")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });
  it("formatea", () => {
    expect(formatDuration(270)).toBe("4:30");
    expect(formatDuration(3735)).toBe("1:02:15");
    expect(formatDuration(null)).toBe("—");
  });
  it("ritmo por km", () => {
    expect(paceSecondsPerKm(5000, 1500)).toBe(300);
    expect(formatPace(300)).toBe("5:00/km");
    expect(paceSecondsPerKm(0, 100)).toBeNull();
  });
});
