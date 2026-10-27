import type { InsurancePlan } from "@/lib/types";

// Fictional carriers and plans. Not modeled on any real insurer.
export const plans: InsurancePlan[] = [
  {
    id: "evergreen-ppo",
    carrier: "Evergreen Health",
    name: "Evergreen Choice PPO",
    planType: "PPO",
    coveredPumpTypes: ["double-electric", "wearable", "manual"],
    allowanceCents: 25000,
    upgradesAllowed: true,
  },
  {
    id: "harbor-hmo",
    carrier: "Harbor Care",
    name: "Harbor Care Select HMO",
    planType: "HMO",
    coveredPumpTypes: ["double-electric", "manual"],
    allowanceCents: 23000,
    upgradesAllowed: true,
  },
  {
    id: "summit-epo",
    carrier: "Summit Mutual",
    name: "Summit Mutual EPO",
    planType: "EPO",
    coveredPumpTypes: ["double-electric", "wearable", "manual"],
    allowanceCents: 35000,
    upgradesAllowed: true,
  },
  {
    id: "bayview-medicaid",
    carrier: "Bayview Community Health",
    name: "Bayview Community Plan",
    planType: "Medicaid",
    coveredPumpTypes: ["double-electric", "manual"],
    allowanceCents: 24000,
    upgradesAllowed: false,
  },
];
