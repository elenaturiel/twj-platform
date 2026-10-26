export type BillingInterval = "month" | "year";
export type DiscountKind = "founder" | "student" | "squad" | "annual" | "custom";
export type DiscountDuration = "once" | "repeating" | "forever";

export type SquadTier = { min_friends: number; percent: number };

/** Configuración de un descuento tal y como está en la tabla `discounts`. */
export type DiscountConfig = {
  id: string;
  code: string | null;
  name: string;
  kind: DiscountKind;
  type: "percent" | "fixed" | "tiered_percent";
  /** % (percent) o céntimos por mes (fixed) */
  value: number | null;
  tiers: SquadTier[] | null;
  duration: DiscountDuration;
  durationMonths: number | null;
  appliesToPlanKeys: string[] | null;
  appliesToIntervals: BillingInterval[] | null;
  maxRedemptions: number | null;
  maxPerClient: number;
  startsAt: string | null;
  expiresAt: string | null;
  requiresVerification: boolean;
  autoApply: boolean;
  stackable: boolean;
  isActive: boolean;
};

/** Un descuento ya resuelto para un cliente concreto (squad con su tramo, etc.). */
export type AppliedDiscount = {
  discountId: string;
  kind: DiscountKind;
  label: string;
  duration: DiscountDuration;
  durationMonths: number | null;
  stackable: boolean;
} & ({ type: "percent"; percent: number } | { type: "fixed"; monthlyCents: number });

export type QuoteLine = {
  discountId: string;
  kind: DiscountKind;
  label: string;
  /** Céntimos que descuenta en cada periodo */
  amountCents: number;
  percent?: number;
  duration: DiscountDuration;
  durationMonths: number | null;
};

export type Quote = {
  interval: BillingInterval;
  months: number;
  /** Precio de lista del periodo (mensual × meses) */
  listCents: number;
  /** Importe final del periodo */
  totalCents: number;
  discountCents: number;
  percentTotal: number;
  lines: QuoteLine[];
  /** Equivalente mensual del total (para mostrar "x €/mes" en anual) */
  monthlyEquivalentCents: number;
};
