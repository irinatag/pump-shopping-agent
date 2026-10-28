import { coveredMemberCostCents } from "@/lib/pricing";
import type { EligibilityResult, IneligibilityReason, InsurancePlan, Pump, Supplier } from "@/lib/types";

/**
 * Deterministic mock of an insurance coverage check. Pure function of its
 * inputs; no network calls and no member data.
 */
export function checkEligibility(plan: InsurancePlan, supplier: Supplier, pump: Pump): EligibilityResult {
  const reasons: IneligibilityReason[] = [];

  if (!supplier.inNetworkPlanIds.includes(plan.id)) reasons.push("out-of-network");
  if (!plan.coveredPumpTypes.includes(pump.type)) reasons.push("pump-type-not-covered");

  const needsUpgrade = coveredMemberCostCents(plan, supplier, pump) > 0;
  if (needsUpgrade && !plan.upgradesAllowed) reasons.push("upgrade-not-allowed");

  if (reasons.length > 0) return { status: "not-covered", reasons };
  return { status: needsUpgrade ? "upgrade" : "fully-covered", reasons };
}
