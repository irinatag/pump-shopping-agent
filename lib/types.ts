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
  /** Maximum the plan pays toward one pump. */
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
  /** Whole-number percent applied to pump retail price, e.g. -5 or 3. */
  priceAdjustmentPct: number;
  /** Flat fee added to the member's cost only when they pay an upgrade. */
  upgradeHandlingFeeCents: number;
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
  supplierId: string;
  pumpId: string;
  status: CoverageStatus;
  reasons: IneligibilityReason[];
  supplierPriceCents: number;
  insurancePaysCents: number;
  outOfPocketCents: number;
  inStock: boolean;
  shippingDays: number;
}

export interface UserPreferences {
  pumpTypes: PumpType[];
  maxOutOfPocketCents: number;
}

export type ScenarioId = "A" | "B" | "E" | "H";

export interface DemoScenario {
  id: ScenarioId;
  title: string;
  summary: string;
  planId: string;
  preferences: UserPreferences;
}
