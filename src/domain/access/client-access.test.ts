import { describe, expect, it } from "vitest";
import { resolveClientAccess, type ClientAccessInput } from "./client-access";

const base: ClientAccessInput = {
  status: "active",
  graceUntil: null,
  onboardingCompleted: true,
  guardianStatus: "not_required",
  today: "2026-10-26",
};

describe("resolveClientAccess", () => {
  it("cliente activo con ficha completa entra", () => {
    expect(resolveClientAccess(base)).toEqual({ kind: "ok" });
  });

  it("sin pago confirmado no entra", () => {
    expect(resolveClientAccess({ ...base, status: "pending_payment" })).toEqual({ kind: "pending_payment" });
  });

  it("past_due dentro de la gracia entra con aviso (el último día incluido)", () => {
    expect(resolveClientAccess({ ...base, status: "past_due", graceUntil: "2026-10-26" })).toEqual({
      kind: "ok",
      warning: { type: "past_due", graceUntil: "2026-10-26" },
    });
  });

  it("past_due con la gracia vencida queda bloqueado", () => {
    expect(resolveClientAccess({ ...base, status: "past_due", graceUntil: "2026-10-25" })).toEqual({
      kind: "blocked",
      reason: "past_due",
    });
  });

  it("past_due sin fecha de gracia queda bloqueado", () => {
    expect(resolveClientAccess({ ...base, status: "past_due" })).toMatchObject({ kind: "blocked" });
  });

  it("pausado y cancelado quedan bloqueados", () => {
    expect(resolveClientAccess({ ...base, status: "paused" })).toEqual({ kind: "blocked", reason: "paused" });
    expect(resolveClientAccess({ ...base, status: "cancelled" })).toEqual({ kind: "blocked", reason: "cancelled" });
  });

  it("menor sin autorización del tutor no entra aunque haya pagado", () => {
    expect(resolveClientAccess({ ...base, guardianStatus: "pending" })).toEqual({ kind: "guardian_pending" });
  });

  it("pagado pero sin ficha va al onboarding", () => {
    expect(resolveClientAccess({ ...base, onboardingCompleted: false })).toEqual({ kind: "needs_onboarding" });
  });

  it("el tutor va antes que la ficha", () => {
    expect(resolveClientAccess({ ...base, onboardingCompleted: false, guardianStatus: "pending" })).toEqual({
      kind: "guardian_pending",
    });
  });
});
