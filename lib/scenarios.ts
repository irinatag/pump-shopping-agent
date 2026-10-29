import type { UserPreferences } from "@/lib/offers/types";

export type ScenarioId = "A" | "B" | "H";

export type OrderStatus = "confirmed" | "failed" | "pending-reconciliation";

/** Scripted checkout behavior for a demo. Executed in Milestone 4. */
export interface CheckoutSimulation {
  supplierId: string;
  productId: string;
  submissionOutcome: "success" | "timeout";
  /** A timeout leaves the order unknown: never auto-confirmed or auto-failed. */
  expectedOrderStatus: OrderStatus;
  /** Retries must reuse one idempotency key so they cannot create duplicate orders. */
  idempotencyKeyRequired: true;
}

/** The same product under the same plan, $0 at one supplier and an upgrade at another. */
export interface PriceComparison {
  productId: string;
  freeSupplierId: string;
  upgradeSupplierId: string;
  upgradeOutOfPocketCents: number;
}

export interface DemoScenario {
  id: ScenarioId;
  title: string;
  summary: string;
  planId: string;
  preferences: UserPreferences;
  priceComparison?: PriceComparison;
  checkout?: CheckoutSimulation;
}

// All plans, suppliers, prices and coverage below are simulated; the pumps are real models.
export const scenarios: DemoScenario[] = [
  {
    id: "A",
    title: "Multiple free options",
    summary: "PPO member looking for a traditional double electric pump; several simulated suppliers offer one at $0.",
    planId: "evergreen-ppo",
    preferences: { categories: ["traditional-electric"] },
  },
  {
    id: "B",
    title: "Same pump, different price",
    summary:
      "Under the same simulated PPO, the Medela Pump In Style Pro is $0 at Bloom Maternity but $75 at MamaMend — both with free shipping.",
    planId: "evergreen-ppo",
    preferences: { categories: ["traditional-electric"] },
    priceComparison: {
      productId: "medela-pump-in-style-pro",
      freeSupplierId: "bloom-maternity",
      upgradeSupplierId: "mama-mend",
      upgradeOutOfPocketCents: 7500,
    },
  },
  {
    id: "H",
    title: "Order submission timeout",
    summary:
      "Member picks a $0 pump, but the simulated supplier's order submission times out; the order must be reconciled, not retried blindly.",
    planId: "summit-epo",
    preferences: { categories: ["traditional-electric"] },
    checkout: {
      supplierId: "coastal-care",
      productId: "spectra-s2-plus",
      submissionOutcome: "timeout",
      expectedOrderStatus: "pending-reconciliation",
      idempotencyKeyRequired: true,
    },
  },
];

export function getScenario(id: ScenarioId): DemoScenario {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}
