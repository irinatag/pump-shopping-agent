import type { CoverageOverride } from "@/lib/types";

// Supplier-specific coverage that differs from the plan's default allowance,
// e.g. a supplier billing the plan under a different equipment code.
export const coverageOverrides: CoverageOverride[] = [
  {
    planId: "evergreen-ppo",
    supplierId: "mama-mend",
    pumpId: "nestlark-classic",
    outOfPocketCents: 7500,
  },
];
