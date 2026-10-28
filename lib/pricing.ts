import { coverageOverrides } from "@/lib/data/coverage-overrides";
import type { CoverageOverride, InsurancePlan, Pump, Supplier } from "@/lib/types";

export function findCoverageOverride(
  plan: InsurancePlan,
  supplier: Supplier,
  pump: Pump,
): CoverageOverride | undefined {
  return coverageOverrides.find(
    (o) => o.planId === plan.id && o.supplierId === supplier.id && o.pumpId === pump.id,
  );
}

/**
 * What the member would pay if the offer is insurance-eligible: the override
 * for this plan + supplier + pump if one exists, else list price above allowance.
 */
export function coveredMemberCostCents(plan: InsurancePlan, supplier: Supplier, pump: Pump): number {
  const override = findCoverageOverride(plan, supplier, pump);
  if (override) return override.outOfPocketCents;
  return Math.max(0, pump.retailPriceCents - plan.allowanceCents);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}
