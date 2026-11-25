import { describe, expect, it } from "vitest";
import { contactToIntake, isFollowupDue, newClientHref } from "./contacts";

describe("isFollowupDue", () => {
  it("toca si el seguimiento es hoy o ya pasó y sigue abierto", () => {
    expect(isFollowupDue({ status: "thinking", next_followup_on: "2026-11-11" }, "2026-11-11")).toBe(true);
    expect(isFollowupDue({ status: "pending", next_followup_on: "2026-11-01" }, "2026-11-11")).toBe(true);
  });
  it("no toca si es más adelante, si no hay fecha o si ya está cerrado", () => {
    expect(isFollowupDue({ status: "thinking", next_followup_on: "2026-11-12" }, "2026-11-11")).toBe(false);
    expect(isFollowupDue({ status: "thinking", next_followup_on: null }, "2026-11-11")).toBe(false);
    expect(isFollowupDue({ status: "client", next_followup_on: "2026-11-01" }, "2026-11-11")).toBe(false);
    expect(isFollowupDue({ status: "lost", next_followup_on: "2026-11-01" }, "2026-11-11")).toBe(false);
  });
});

describe("contactToIntake", () => {
  it("pasa a la ficha lo apuntado en la llamada, limpio", () => {
    expect(
      contactToIntake({
        goal: "  Ganar músculo ",
        injuries: "",
        experience: "intermediate",
        available_days: [4, 0, 2, 2, 9],
        availability_notes: "Mañanas",
        equipment: "gym",
        equipment_notes: null,
        allergy_notes: "Sin lactosa",
      }),
    ).toEqual({
      goal: "Ganar músculo",
      injuries: null,
      experience: "intermediate",
      available_days: [0, 2, 4],
      class_schedule: "Mañanas",
      equipment: "gym",
      equipment_notes: null,
      allergy_notes: "Sin lactosa",
    });
  });
});

describe("newClientHref", () => {
  it("lleva al alta con los datos del contacto", () => {
    const href = newClientHref({
      id: "c1",
      full_name: "Ana Pérez",
      email: "ana@x.es",
      phone: "+34 600",
      plan_interest: "mvp",
    });
    const url = new URL(href, "https://x");
    expect(url.pathname).toBe("/panel/clientes/nuevo");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      nombre: "Ana Pérez",
      contacto: "c1",
      email: "ana@x.es",
      telefono: "+34 600",
      plan: "mvp",
    });
  });
});
