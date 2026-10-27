import type { DemoScenario, ScenarioId } from "@/lib/types";

export const scenarios: DemoScenario[] = [
  {
    id: "A",
    title: "Fully covered",
    summary: "PPO member who wants a standard double-electric pump at no cost.",
    planId: "evergreen-ppo",
    preferences: { pumpTypes: ["double-electric"], maxOutOfPocketCents: 0 },
  },
  {
    id: "B",
    title: "Wearable upgrade",
    summary: "PPO member who wants a wearable pump and will pay an upgrade fee.",
    planId: "evergreen-ppo",
    preferences: { pumpTypes: ["wearable"], maxOutOfPocketCents: 15000 },
  },
  {
    id: "E",
    title: "Narrow HMO network",
    summary: "HMO member with only two in-network suppliers, one partly out of stock.",
    planId: "harbor-hmo",
    preferences: { pumpTypes: ["double-electric"], maxOutOfPocketCents: 5000 },
  },
  {
    id: "H",
    title: "Preferred type not covered",
    summary: "Medicaid member who wants a wearable, which the plan does not cover and cannot be upgraded to.",
    planId: "bayview-medicaid",
    preferences: { pumpTypes: ["wearable"], maxOutOfPocketCents: 0 },
  },
];

export function getScenario(id: ScenarioId): DemoScenario {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}
