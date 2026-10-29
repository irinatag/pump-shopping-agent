import type { SimulatedSupplier } from "@/lib/suppliers/types";

// Twelve fictional durable-medical-equipment suppliers for the simulated demo.
// Names are invented and must not resemble real suppliers or pump brands.
const supplier = (s: Omit<SimulatedSupplier, "provenance">): SimulatedSupplier => ({ ...s, provenance: "simulated" });

export const simulatedSuppliers: SimulatedSupplier[] = [
  supplier({ id: "cradle-supply", name: "Cradle Supply Co.", inNetworkPlanIds: ["evergreen-ppo", "summit-epo", "bayview-medicaid"], shippingDays: 3, rating: 4.7 }),
  supplier({ id: "milkway-medical", name: "MilkWay Medical", inNetworkPlanIds: ["evergreen-ppo", "summit-epo"], shippingDays: 2, rating: 4.5 }),
  supplier({ id: "harborside-dme", name: "Harborside DME", inNetworkPlanIds: ["harbor-hmo", "evergreen-ppo"], shippingDays: 4, rating: 4.2 }),
  supplier({ id: "little-latch", name: "Little Latch Direct", inNetworkPlanIds: ["evergreen-ppo", "summit-epo"], shippingDays: 2, rating: 4.8 }),
  supplier({ id: "bloom-maternity", name: "Bloom Maternity Supply", inNetworkPlanIds: ["evergreen-ppo", "bayview-medicaid"], shippingDays: 5, rating: 4.1 }),
  supplier({ id: "northstar-health", name: "Northstar Home Health", inNetworkPlanIds: ["summit-epo"], shippingDays: 3, rating: 4.4 }),
  supplier({ id: "mama-mend", name: "MamaMend Medical", inNetworkPlanIds: ["evergreen-ppo", "bayview-medicaid"], shippingDays: 4, rating: 4.3 }),
  supplier({ id: "anchor-medical", name: "Anchor Medical Supply", inNetworkPlanIds: ["harbor-hmo"], shippingDays: 6, rating: 3.9 }),
  supplier({ id: "nurture-dme", name: "Nurture DME", inNetworkPlanIds: ["evergreen-ppo", "summit-epo"], shippingDays: 3, rating: 4.6 }),
  supplier({ id: "first-feed", name: "First Feed Supply", inNetworkPlanIds: ["evergreen-ppo", "bayview-medicaid"], shippingDays: 2, rating: 4.0 }),
  supplier({ id: "wren-lane", name: "Wren Lane Medical", inNetworkPlanIds: [], shippingDays: 1, rating: 4.9 }),
  supplier({ id: "coastal-care", name: "Coastal Care Equipment", inNetworkPlanIds: ["summit-epo"], shippingDays: 5, rating: 4.2 }),
];
