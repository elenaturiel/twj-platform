import { describe, expect, it } from "vitest";
import { bestKey, estimatedOneRepMax, newRecords, recordCandidates } from "./records";

describe("1RM estimado", () => {
  it("Epley", () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100);
    expect(estimatedOneRepMax(100, 5)).toBe(116.7);
    expect(estimatedOneRepMax(100, 15)).toBeNull();
    expect(estimatedOneRepMax(0, 5)).toBeNull();
  });
});

describe("récords", () => {
  const sets = [
    { id: "a", exerciseId: "sq", reps: 5, loadKg: 100 },
    { id: "b", exerciseId: "sq", reps: 3, loadKg: 105 },
    { id: "c", exerciseId: null, distanceM: 5000, durationS: 1500 },
    { id: "d", exerciseId: null, stationKey: "skierg", durationS: 250, distanceM: 1000 },
  ];

  it("primera marca cuenta como récord (salvo distancia)", () => {
    const recs = newRecords(recordCandidates(sets), new Map());
    const keys = recs.map((r) => `${r.recordType}:${r.value}`).sort();
    expect(keys).toEqual(["best_time:1500", "e1rm:116.7", "hyrox_station:250", "max_load:105"].sort());
  });

  it("solo supera si mejora la anterior", () => {
    const prev = new Map<string, number>([
      [bestKey({ recordType: "max_load", exerciseId: "sq", recordKey: "" }), 110],
      [bestKey({ recordType: "e1rm", exerciseId: "sq", recordKey: "" }), 110],
      [bestKey({ recordType: "best_time", exerciseId: null, recordKey: "5000" }), 1480],
      [bestKey({ recordType: "hyrox_station", exerciseId: null, recordKey: "skierg" }), 260],
      [bestKey({ recordType: "longest_distance", exerciseId: null, recordKey: "" }), 4000],
    ]);
    const recs = newRecords(recordCandidates(sets), prev);
    expect(recs.map((r) => r.recordType).sort()).toEqual(["e1rm", "hyrox_station", "longest_distance"]);
  });
});
