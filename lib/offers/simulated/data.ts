// Fictional plans, supplier offerings, and coverage overrides for the simulated demo.
// Products are real catalog models; every price, network, stock level and coverage
// rule below is invented and must be presented as simulated.
import type { PumpCategory } from "@/lib/products/types";

export interface SimulatedPlan {
  id: string;
  carrier: string;
  name: string;
  planType: "PPO" | "HMO" | "EPO" | "Medicaid";
  coveredCategories: PumpCategory[];
  /** Default maximum the plan pays toward one pump. */
  allowanceCents: number;
  upgradesAllowed: boolean;
}

export interface SimulatedOffering {
  supplierId: string;
  productId: string;
  /** Simulated list price — not the product's real retail price. */
  listPriceCents: number;
  inStock: boolean;
}

/** Exact member cost for one plan + supplier + product; 0 = fully covered. */
export interface CoverageOverride {
  planId: string;
  supplierId: string;
  productId: string;
  pumpOutOfPocketCents: number;
}

/** Demo business rule: every simulated insurance pump offer ships free. */
export const SIMULATED_SHIPPING_CENTS = 0;

const ELECTRIC: PumpCategory[] = ["traditional-electric", "portable-electric", "hands-free-electric"];

export const simulatedPlans: SimulatedPlan[] = [
  { id: "evergreen-ppo", carrier: "Evergreen Health", name: "Evergreen Choice PPO", planType: "PPO", coveredCategories: [...ELECTRIC, "wearable", "manual"], allowanceCents: 25000, upgradesAllowed: true },
  { id: "harbor-hmo", carrier: "Harbor Care", name: "Harbor Care Select HMO", planType: "HMO", coveredCategories: [...ELECTRIC, "manual"], allowanceCents: 23000, upgradesAllowed: true },
  { id: "summit-epo", carrier: "Summit Mutual", name: "Summit Mutual EPO", planType: "EPO", coveredCategories: [...ELECTRIC, "wearable", "manual"], allowanceCents: 35000, upgradesAllowed: true },
  { id: "bayview-medicaid", carrier: "Bayview Community Health", name: "Bayview Community Plan", planType: "Medicaid", coveredCategories: [...ELECTRIC, "manual"], allowanceCents: 24000, upgradesAllowed: false },
];

// One simulated list price per product, reused by every supplier that offers it.
const PRICE: Record<string, number> = {
  "spectra-s2-plus": 19900,
  "spectra-s1-plus": 27900,
  "medela-pump-in-style-pro": 22900,
  "willow-go": 39900,
  "medela-motion-inbra": 32900,
  "willow-360": 49900,
  "medela-harmony": 4500,
  "lansinoh-manual": 3900,
  "medela-symphony-plus": 120000,
};

function offers(supplierId: string, productIds: string[], outOfStock: string[] = []): SimulatedOffering[] {
  return productIds.map((productId) => ({
    supplierId,
    productId,
    listPriceCents: PRICE[productId],
    inStock: !outOfStock.includes(productId),
  }));
}

export const simulatedOfferings: SimulatedOffering[] = [
  ...offers("cradle-supply", ["spectra-s2-plus", "spectra-s1-plus", "willow-go", "medela-harmony"]),
  ...offers("milkway-medical", ["spectra-s1-plus", "medela-pump-in-style-pro", "willow-go", "medela-motion-inbra", "willow-360"], ["willow-360"]),
  ...offers("harborside-dme", ["spectra-s2-plus", "medela-pump-in-style-pro", "medela-harmony", "medela-symphony-plus"]),
  ...offers("little-latch", ["medela-motion-inbra", "willow-go", "willow-360", "lansinoh-manual"]),
  ...offers("bloom-maternity", ["spectra-s2-plus", "medela-pump-in-style-pro", "lansinoh-manual", "medela-harmony"]),
  ...offers("northstar-health", ["spectra-s1-plus", "willow-360", "medela-symphony-plus"]),
  ...offers("mama-mend", ["spectra-s2-plus", "spectra-s1-plus", "medela-pump-in-style-pro", "medela-motion-inbra"], ["spectra-s2-plus"]),
  ...offers("anchor-medical", ["spectra-s2-plus", "spectra-s1-plus", "medela-pump-in-style-pro", "medela-harmony"], ["spectra-s2-plus"]),
  ...offers("nurture-dme", ["medela-pump-in-style-pro", "willow-go", "medela-motion-inbra", "lansinoh-manual"]),
  ...offers("first-feed", ["spectra-s2-plus", "medela-motion-inbra", "medela-harmony", "lansinoh-manual"]),
  ...offers("wren-lane", ["willow-360", "willow-go", "spectra-s1-plus"]),
  ...offers("coastal-care", ["spectra-s2-plus", "medela-pump-in-style-pro", "medela-motion-inbra", "medela-symphony-plus"]),
];

export const coverageOverrides: CoverageOverride[] = [
  { planId: "evergreen-ppo", supplierId: "mama-mend", productId: "medela-pump-in-style-pro", pumpOutOfPocketCents: 7500 },
];
