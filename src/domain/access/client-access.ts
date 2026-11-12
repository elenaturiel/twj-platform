export type ClientStatus = "pending_payment" | "active" | "past_due" | "paused" | "cancelled";
export type GuardianStatus = "not_required" | "pending" | "confirmed";

export type ClientAccessInput = {
  status: ClientStatus;
  /** Fin de la gracia (YYYY-MM-DD, hora de Madrid) si está en past_due */
  graceUntil: string | null;
  onboardingCompleted: boolean;
  guardianStatus: GuardianStatus;
  /** Hoy en Madrid, YYYY-MM-DD */
  today: string;
};

export type ClientAccess =
  | { kind: "ok"; warning?: { type: "past_due"; graceUntil: string } }
  | { kind: "pending_payment" }
  | { kind: "blocked"; reason: "past_due" | "paused" | "cancelled" }
  | { kind: "guardian_pending" }
  | { kind: "needs_onboarding" };

/**
 * Decide qué puede hacer un cliente en la app. El orden importa:
 * 1) pago, 2) tutor (menores), 3) ficha de onboarding.
 * La misma regla está en SQL (client_has_access) para RLS.
 */
export function resolveClientAccess(input: ClientAccessInput): ClientAccess {
  const { status, graceUntil, onboardingCompleted, guardianStatus, today } = input;

  if (status === "pending_payment") return { kind: "pending_payment" };
  if (status === "cancelled") return { kind: "blocked", reason: "cancelled" };
  if (status === "paused") return { kind: "blocked", reason: "paused" };

  const inGrace = status === "past_due" && graceUntil !== null && graceUntil >= today;
  if (status === "past_due" && !inGrace) return { kind: "blocked", reason: "past_due" };

  if (guardianStatus === "pending") return { kind: "guardian_pending" };
  if (!onboardingCompleted) return { kind: "needs_onboarding" };

  return inGrace && graceUntil ? { kind: "ok", warning: { type: "past_due", graceUntil } } : { kind: "ok" };
}
