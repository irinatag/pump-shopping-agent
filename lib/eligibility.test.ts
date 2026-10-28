import { describe, expect, it } from "vitest";
import { getPlan, getPump, getSupplier } from "@/lib/catalog";
import { checkEligibility } from "@/lib/eligibility";

const check = (planId: string, supplierId: string, pumpId: string) =>
  checkEligibility(getPlan(planId), getSupplier(supplierId), getPump(pumpId));

describe("checkEligibility", () => {
  it("fully covers an in-network pump priced within the allowance", () => {
    expect(check("evergreen-ppo", "cradle-supply", "lunaria-duo")).toEqual({
      status: "fully-covered",
      reasons: [],
    });
  });

  it("returns upgrade when price exceeds allowance and upgrades are allowed", () => {
    expect(check("evergreen-ppo", "cradle-supply", "nestlark-free").status).toBe("upgrade");
  });

  it("applies a supplier-specific override for one plan + supplier + pump", () => {
    expect(check("evergreen-ppo", "bloom-maternity", "nestlark-classic").status).toBe("fully-covered");
    expect(check("evergreen-ppo", "mama-mend", "nestlark-classic").status).toBe("upgrade");
  });

  it("does not apply an override to a different plan", () => {
    expect(check("bayview-medicaid", "mama-mend", "nestlark-classic").status).toBe("fully-covered");
  });

  it("rejects out-of-network suppliers", () => {
    expect(check("evergreen-ppo", "willow-lane", "lunaria-duo-plus")).toEqual({
      status: "not-covered",
      reasons: ["out-of-network"],
    });
  });

  it("rejects pump types the plan does not cover", () => {
    expect(check("harbor-hmo", "harborside-dme", "orchard-clinical").reasons).toContain(
      "pump-type-not-covered",
    );
  });

  it("rejects upgrades on plans that disallow them", () => {
    expect(check("bayview-medicaid", "cradle-supply", "lunaria-duo-plus")).toEqual({
      status: "not-covered",
      reasons: ["upgrade-not-allowed"],
    });
  });

  it("reports every applicable reason", () => {
    expect(check("bayview-medicaid", "willow-lane", "willowmere-pro").reasons).toEqual([
      "out-of-network",
      "pump-type-not-covered",
      "upgrade-not-allowed",
    ]);
  });
});
