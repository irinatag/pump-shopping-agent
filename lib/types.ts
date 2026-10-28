// All monetary values are integer cents. Format only at the UI boundary.

export type PumpType = "double-electric" | "wearable" | "manual" | "hospital-grade";

export interface Pump {
  id: string;
  name: string;
  brand: string;
  type: PumpType;
  retailPriceCents: number;
  weightOz: number;
  maxSuctionMmHg: number;
  /** null for pumps without a battery (manual or plug-in only). */
  batteryHours: number | null;
  noiseDb: number;
  features: string[];
}

export type PlanType = "PPO" | "HMO" | "EPO" | "Medicaid";

export interface InsurancePlan {
  id: string;
  carrier: string;
  name: string;
  planType: PlanType;
  coveredPumpTypes: PumpType[];
  /** Default maximum the plan pays toward one pump. */
  allowanceCents: number;
  /** Whether the member may pay the difference for a pump above the allowance. */
  upgradesAllowed: boolean;
}

export interface SupplierOffering {
  pumpId: string;
  inStock: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  inNetworkPlanIds: string[];
  offerings: SupplierOffering[];
  /** Business days from order to delivery. */
  shippingDays: number;
  /** 1.0–5.0 */
  rating: number;
}

/**
 * Supplier-specific coverage for one plan + supplier + pump, replacing the
 * plan's default allowance math. 0 means fully covered; above 0 is an upgrade.
 * Only applies once network and pump-type checks pass.
 */
export interface CoverageOverride {
  planId: string;
  supplierId: string;
  pumpId: string;
  outOfPocketCents: number;
}

export type CoverageStatus = "fully-covered" | "upgrade" | "not-covered";

export type IneligibilityReason =
  | "out-of-network"
  | "pump-type-not-covered"
  | "upgrade-not-allowed";

export interface EligibilityResult {
  status: CoverageStatus;
  /** Empty unless status is "not-covered". */
  reasons: IneligibilityReason[];
}

export interface Quote {
  planId: string;
  supplierId: string;
  pumpId: string;
  status: CoverageStatus;
  reasons: IneligibilityReason[];
  listPriceCents: number;
  insurancePaysCents: number;
  outOfPocketCents: number;
  inStock: boolean;
  shippingDays: number;
}

export interface UserPreferences {
  /** Empty means any pump type. */
  pumpTypes: PumpType[];
}

export type CoverageUnverifiedReason = "unknown_plan" | "verification_failed";

/**
 * Result of the default free-pump search. `offers` only ever holds eligible,
 * in-stock $0 quotes; paid upgrades are never recommended here.
 */
export type FreeOfferSearch =
  | { outcome: "free_offers_found"; offers: Quote[] }
  | { outcome: "no_free_offers"; offers: [] }
  | { outcome: "coverage_unverified"; reason: CoverageUnverifiedReason; offers: [] };

export type OrderStatus = "confirmed" | "failed" | "pending-reconciliation";

/** Scripted checkout behavior for a demo. Executed in Milestone 4. */
export interface CheckoutSimulation {
  supplierId: string;
  pumpId: string;
  submissionOutcome: "success" | "timeout";
  /** A timeout leaves the order unknown: never auto-confirmed or auto-failed. */
  expectedOrderStatus: OrderStatus;
  /** Retries must reuse one idempotency key so they cannot create duplicate orders. */
  idempotencyKeyRequired: true;
}

/** The same pump under the same plan, $0 at one supplier and an upgrade at another. */
export interface PriceComparison {
  pumpId: string;
  freeSupplierId: string;
  upgradeSupplierId: string;
  upgradeOutOfPocketCents: number;
}

export type ScenarioId = "A" | "B" | "H";

export interface DemoScenario {
  id: ScenarioId;
  title: string;
  summary: string;
  planId: string;
  preferences: UserPreferences;
  priceComparison?: PriceComparison;
  checkout?: CheckoutSimulation;
}
