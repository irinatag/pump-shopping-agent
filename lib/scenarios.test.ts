import { describe, expect, it } from "vitest";
import { getPlan, getPump, getSupplier } from "@/lib/catalog";
import { findFreeOffers, quoteOffer, rankQuotes } from "@/lib/quotes";
import { getScenario, scenarios } from "@/lib/scenarios";

describe("demo scenarios", () => {
  it("defines exactly A, B and H", () => {
    expect(scenarios.map((s) => s.id)).toEqual(["A", "B", "H"]);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))(
    "%s: has at least one eligible, in-stock $0 offer",
    (_id, scenario) => {
      const result = findFreeOffers(scenario.planId, scenario.preferences);
      expect(result.outcome).toBe("free_offers_found");
    },
  );
});

describe("Scenario A: multiple free options", () => {
  it("returns multiple $0 in-stock offers from several suppliers", () => {
    const { planId, preferences } = getScenario("A");
    const result = findFreeOffers(planId, preferences);
    if (result.outcome !== "free_offers_found") throw new Error(result.outcome);

    expect(result.offers).toHaveLength(8);
    expect(new Set(result.offers.map((q) => q.supplierId)).size).toBe(6);
    for (const q of result.offers) {
      expect(q).toMatchObject({ status: "fully-covered", inStock: true, outOfPocketCents: 0 });
    }
  });
});

describe("Scenario B: same pump, different price", () => {
  const scenario = getScenario("B");
  const comparison = scenario.priceComparison!;
  const plan = getPlan(scenario.planId);
  const freeSupplier = getSupplier(comparison.freeSupplierId);
  const upgradeSupplier = getSupplier(comparison.upgradeSupplierId);
  const pump = getPump(comparison.pumpId);
  const free = quoteOffer(plan, freeSupplier, pump);
  const upgrade = quoteOffer(plan, upgradeSupplier, pump);

  it("compares the same plan and pump at two different suppliers", () => {
    expect(free.planId).toBe(upgrade.planId);
    expect(free.pumpId).toBe(upgrade.pumpId);
    expect(free.supplierId).not.toBe(upgrade.supplierId);
  });

  it("uses two in-network suppliers with the pump in stock", () => {
    expect(freeSupplier.inNetworkPlanIds).toContain(plan.id);
    expect(upgradeSupplier.inNetworkPlanIds).toContain(plan.id);
    expect(free.inStock).toBe(true);
    expect(upgrade.inStock).toBe(true);
  });

  it("costs exactly $0 at one supplier and $75 at the other, both insurance-eligible", () => {
    expect(free).toMatchObject({ status: "fully-covered", reasons: [], outOfPocketCents: 0 });
    expect(upgrade).toMatchObject({ status: "upgrade", reasons: [], outOfPocketCents: 7500 });
    expect(comparison.upgradeOutOfPocketCents).toBe(7500);
  });

  it("ranks the $0 offer ahead of the $75 offer, even though the $75 supplier ships faster", () => {
    expect(upgrade.shippingDays).toBeLessThan(free.shippingDays);
    expect(rankQuotes([upgrade, free])).toEqual([free, upgrade]);
  });

  it("keeps the $75 quote for comparison but leaves it out of the default free search", () => {
    const { offers } = findFreeOffers(scenario.planId, scenario.preferences);
    const forPump = offers.filter((q) => q.pumpId === comparison.pumpId);
    expect(forPump).toContainEqual(free);
    expect(forPump).not.toContainEqual(upgrade);
  });
});

describe("Scenario H: order submission timeout", () => {
  const scenario = getScenario("H");
  const checkout = scenario.checkout!;

  it("starts from an eligible, in-stock $0 selection", () => {
    const q = quoteOffer(
      getPlan(scenario.planId),
      getSupplier(checkout.supplierId),
      getPump(checkout.pumpId),
    );
    expect(q).toMatchObject({ status: "fully-covered", inStock: true, outOfPocketCents: 0 });
  });

  it("expects a timeout to leave the order pending reconciliation", () => {
    expect(checkout.submissionOutcome).toBe("timeout");
    expect(checkout.expectedOrderStatus).toBe("pending-reconciliation");
  });

  it("requires an idempotency key so retries cannot duplicate the order", () => {
    expect(checkout.idempotencyKeyRequired).toBe(true);
  });
});
