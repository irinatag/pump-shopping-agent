import { describe, expect, it } from "vitest";
import { getProduct } from "@/lib/products";
import { getSimulatedSupplier } from "@/lib/suppliers";
import { findFreeOffers, rankQuotes } from "@/lib/offers/search";
import { SimulatedQuoteProvider } from "@/lib/offers/simulated/provider";
import { getScenario, scenarios } from "@/lib/scenarios";

const provider = new SimulatedQuoteProvider();

async function quotesFor(planId: string, productId: string) {
  const r = await provider.getQuotes({ planId, productIds: [productId] });
  if (r.status !== "ok") throw new Error(r.status);
  return r.quotes;
}

describe("demo scenarios", () => {
  it("defines exactly A, B and H", () => {
    expect(scenarios.map((s) => s.id)).toEqual(["A", "B", "H"]);
  });

  it.each(scenarios.map((s) => [s.id, s] as const))("%s has at least one qualifying $0 offer", async (_id, s) => {
    expect((await findFreeOffers(provider, s.planId, s.preferences)).outcome).toBe("free_offers_found");
  });

  it("references real catalog products and simulated suppliers", () => {
    for (const s of scenarios) {
      if (s.priceComparison) {
        expect(() => getProduct(s.priceComparison!.productId)).not.toThrow();
        expect(getSimulatedSupplier(s.priceComparison.freeSupplierId).provenance).toBe("simulated");
        expect(getSimulatedSupplier(s.priceComparison.upgradeSupplierId).provenance).toBe("simulated");
      }
      if (s.checkout) {
        expect(() => getProduct(s.checkout!.productId)).not.toThrow();
        expect(getSimulatedSupplier(s.checkout.supplierId).provenance).toBe("simulated");
      }
    }
  });
});

describe("Scenario A: multiple free options", () => {
  it("returns 8 qualifying offers from 6 suppliers", async () => {
    const { planId, preferences } = getScenario("A");
    const result = await findFreeOffers(provider, planId, preferences);
    expect(result.offers).toHaveLength(8);
    expect(new Set(result.offers.map((q) => q.supplierId)).size).toBe(6);
    expect(new Set(result.offers.map((q) => q.productId)).size).toBeGreaterThan(1);
  });
});

describe("Scenario B: same pump, different price", () => {
  const scenario = getScenario("B");
  const c = scenario.priceComparison!;

  async function pair() {
    const qs = await quotesFor(scenario.planId, c.productId);
    return { free: qs.find((q) => q.supplierId === c.freeSupplierId)!, paid: qs.find((q) => q.supplierId === c.upgradeSupplierId)! };
  }

  it("compares the same real product under the same plan at two different in-network suppliers", async () => {
    const { free, paid } = await pair();
    expect(getProduct(c.productId).brand).toBe("Medela");
    expect([free.planId, free.productId]).toEqual([paid.planId, paid.productId]);
    expect(free.supplierId).not.toBe(paid.supplierId);
    expect(getSimulatedSupplier(free.supplierId).inNetworkPlanIds).toContain(scenario.planId);
    expect(getSimulatedSupplier(paid.supplierId).inNetworkPlanIds).toContain(scenario.planId);
    expect(free.inStock && paid.inStock).toBe(true);
  });

  it("is $0 at one supplier and exactly $75 at the other, with free shipping at both", async () => {
    const { free, paid } = await pair();
    expect(free).toMatchObject({ status: "fully-covered", charges: { shippingCents: 0, totalOutOfPocketCents: 0 } });
    expect(paid).toMatchObject({ status: "upgrade", reasons: [], charges: { shippingCents: 0, totalOutOfPocketCents: 7500 } });
    expect(c.upgradeOutOfPocketCents).toBe(7500);
  });

  it("ranks the $0 offer first even though the $75 supplier ships faster", async () => {
    const { free, paid } = await pair();
    expect(paid.shippingDays!).toBeLessThan(free.shippingDays!);
    expect(rankQuotes([paid, free])).toEqual([free, paid]);
  });

  it("keeps the $75 quote out of free-only search results", async () => {
    const { free, paid } = await pair();
    const { offers } = await findFreeOffers(provider, scenario.planId, scenario.preferences);
    expect(offers).toContainEqual(free);
    expect(offers).not.toContainEqual(paid);
  });
});

describe("Scenario H: order submission timeout", () => {
  const scenario = getScenario("H");
  const checkout = scenario.checkout!;

  it("starts from a qualifying $0 selection", async () => {
    const q = (await quotesFor(scenario.planId, checkout.productId)).find((x) => x.supplierId === checkout.supplierId)!;
    expect(q).toMatchObject({ status: "fully-covered", inStock: true, charges: { totalOutOfPocketCents: 0, shippingCents: 0 } });
  });

  it("expects a timeout to leave the order pending reconciliation, guarded by an idempotency key", () => {
    expect(checkout.submissionOutcome).toBe("timeout");
    expect(checkout.expectedOrderStatus).toBe("pending-reconciliation");
    expect(checkout.idempotencyKeyRequired).toBe(true);
  });
});
