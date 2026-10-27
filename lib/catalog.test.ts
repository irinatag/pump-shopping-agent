import { describe, expect, it } from "vitest";
import { getPlan, getPump, getSupplier, plans, pumps, suppliers } from "@/lib/catalog";

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
      ...suppliers.map((s) => s.upgradeHandlingFeeCents),
    ];
    for (const cents of amounts) {
      expect(Number.isInteger(cents)).toBe(true);
      expect(cents).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps supplier ratings and adjustments in range", () => {
    for (const s of suppliers) {
      expect(s.rating).toBeGreaterThanOrEqual(1);
      expect(s.rating).toBeLessThanOrEqual(5);
      expect(Number.isInteger(s.priceAdjustmentPct)).toBe(true);
      expect(Math.abs(s.priceAdjustmentPct)).toBeLessThanOrEqual(10);
    }
  });

  it("throws on unknown ids", () => {
    expect(() => getPump("nope")).toThrow("Unknown pump: nope");
    expect(() => getPlan("nope")).toThrow("Unknown plan: nope");
    expect(() => getSupplier("nope")).toThrow("Unknown supplier: nope");
  });
});
