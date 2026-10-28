import type { DemoScenario, ScenarioId } from "@/lib/types";

export const scenarios: DemoScenario[] = [
  {
    id: "A",
    title: "Multiple free options",
    summary: "PPO member looking for a double-electric pump; several suppliers offer one at $0.",
    planId: "evergreen-ppo",
    preferences: { pumpTypes: ["double-electric"] },
  },
  {
    id: "B",
    title: "Same pump, different price",
    summary:
      "The same Nestlark Classic under the same PPO is $0 at Bloom Maternity but $75 at MamaMend.",
    planId: "evergreen-ppo",
    preferences: { pumpTypes: ["double-electric"] },
    priceComparison: {
      pumpId: "nestlark-classic",
      freeSupplierId: "bloom-maternity",
      upgradeSupplierId: "mama-mend",
      upgradeOutOfPocketCents: 7500,
    },
  },
  {
    id: "H",
    title: "Order submission timeout",
    summary:
      "Member picks a $0 pump, but the supplier's order submission times out; the order must be reconciled, not retried blindly.",
    planId: "summit-epo",
    preferences: { pumpTypes: ["double-electric"] },
    checkout: {
      supplierId: "coastal-care",
      pumpId: "lunaria-duo",
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
