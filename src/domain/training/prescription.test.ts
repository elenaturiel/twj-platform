import { describe, expect, it } from "vitest";
import { plannedSets, prescriptionSchema, summarizePart, summarizePrescription } from "./prescription";

describe("prescripciones", () => {
  it("gym", () => {
    const p = prescriptionSchema.parse({ sets: "4", reps: "8-10", load_kg: "60", rpe: "8", rest_s: "120" });
    expect(summarizePrescription(p)).toBe("4 × 8-10 · 60 kg · RPE 8 · desc. 2:00");
    expect(plannedSets(p)).toBe(4);
  });
  it("running por series", () => {
    const p = prescriptionSchema.parse({ repeat: 6, distance_m: 400, pace_min_s: 240, pace_max_s: 250, rest_s: 90 });
    expect(summarizePrescription(p)).toBe("6 × 400 m · 4:00–4:10/km · desc. 1:30");
    expect(plannedSets(p)).toBe(6);
  });
  it("rodaje por distancia y zona", () => {
    const p = prescriptionSchema.parse({ distance_m: 8000, hr_zone: "Z2" });
    expect(summarizePrescription(p)).toBe("8 km · Z2");
  });
  it("campos vacíos se ignoran", () => {
    const p = prescriptionSchema.parse({ sets: "", reps: "", load_kg: "" });
    expect(summarizePrescription(p)).toBe("");
    expect(plannedSets(p)).toBe(1);
  });
  it("partes", () => {
    expect(summarizePart("amrap", { minutes: 12 })).toBe("AMRAP · 12 min");
    expect(summarizePart("emom", { minutes: 10, every_s: 90 })).toBe("EMOM · 10 min cada 1:30");
    expect(summarizePart("tabata", {})).toBe('Tabata · 8 × 20"/10"');
    expect(summarizePart("for_time", { rounds: 3, time_cap_s: 900 })).toBe("For time · 3 rondas · cap 15:00");
  });
});
