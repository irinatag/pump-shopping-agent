import { describe, expect, it } from "vitest";
import { getPlan, getPump, getSupplier, plans, pumps, suppliers } from "@/lib/catalog";
import { coverageOverrides } from "@/lib/data/coverage-overrides";

const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe("catalog data integrity", () => {
  it("has 12 suppliers with unique ids", () => {
    expect(suppliers).toHaveLength(12);
    expect(unique(suppliers.map((s) => s.id))).toBe(true);
  });

  it("has unique pump and plan ids", () => {
    expect(unique(pumps.map((p) => p.id))).toBe(true);
    expect(unique(plans.map((p) => p.id))).toBe(true);
  });

  it("only references pumps and plans that exist", () => {
    for (const supplier of suppliers) {
      for (const { pumpId } of supplier.offerings) expect(() => getPump(pumpId)).not.toThrow();
      for (const planId of supplier.inNetworkPlanIds) expect(() => getPlan(planId)).not.toThrow();
    }
  });

  it("stores money as non-negative integer cents", () => {
    const amounts = [
      ...pumps.map((p) => p.retailPriceCents),
      ...plans.map((p) => p.allowanceCents),
      ...coverageOverrides.map((o) => o.outOfPocketCents),
    ];
    for (const cents of amounts) {
      expect(Number.isInteger(cents)).toBe(true);
      expect(cents).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps supplier ratings in range", () => {
    for (const s of suppliers) {
      expect(s.rating).toBeGreaterThanOrEqual(1);
      expect(s.rating).toBeLessThanOrEqual(5);
    }
  });

  it("only overrides offers that exist, are in network, and cost no more than list price", () => {
    const keys = coverageOverrides.map((o) => `${o.planId}/${o.supplierId}/${o.pumpId}`);
    expect(unique(keys)).toBe(true);

    for (const o of coverageOverrides) {
      const supplier = getSupplier(o.supplierId);
      expect(supplier.inNetworkPlanIds).toContain(getPlan(o.planId).id);
      expect(supplier.offerings.map((x) => x.pumpId)).toContain(o.pumpId);
      expect(o.outOfPocketCents).toBeLessThanOrEqual(getPump(o.pumpId).retailPriceCents);
    }
  });

  it("throws on unknown ids", () => {
    expect(() => getPump("nope")).toThrow("Unknown pump: nope");
    expect(() => getPlan("nope")).toThrow("Unknown plan: nope");
    expect(() => getSupplier("nope")).toThrow("Unknown supplier: nope");
  });
});
