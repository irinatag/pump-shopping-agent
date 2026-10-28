import { describe, expect, it } from "vitest";
import { getPlan, getPump, getSupplier, plans, suppliers } from "@/lib/catalog";
import { formatCents } from "@/lib/pricing";
import { findFreeOffers, quoteOffer, quotesForPlan, rankQuotes } from "@/lib/quotes";

const quote = (planId: string, supplierId: string, pumpId: string) =>
  quoteOffer(getPlan(planId), getSupplier(supplierId), getPump(pumpId));

describe("quoteOffer", () => {
  it("charges nothing when fully covered", () => {
    expect(quote("evergreen-ppo", "cradle-supply", "lunaria-duo")).toMatchObject({
      status: "fully-covered",
      listPriceCents: 19900,
      insurancePaysCents: 19900,
      outOfPocketCents: 0,
    });
  });

  it("charges the difference above the allowance for a default upgrade", () => {
    expect(quote("evergreen-ppo", "cradle-supply", "nestlark-free")).toMatchObject({
      status: "upgrade",
      insurancePaysCents: 25000,
      outOfPocketCents: 14900,
    });
  });

  it("uses the override's exact member cost", () => {
    expect(quote("evergreen-ppo", "mama-mend", "nestlark-classic")).toMatchObject({
      status: "upgrade",
      listPriceCents: 22900,
      insurancePaysCents: 15400,
      outOfPocketCents: 7500,
    });
  });

  it("charges full list price when not covered", () => {
    expect(quote("evergreen-ppo", "willow-lane", "willowmere-pro")).toMatchObject({
      status: "not-covered",
      insurancePaysCents: 0,
      outOfPocketCents: 49900,
    });
  });

  it("carries stock and shipping from the supplier", () => {
    expect(quote("evergreen-ppo", "milkway-medical", "willowmere-pro")).toMatchObject({
      inStock: false,
      shippingDays: 2,
    });
  });

  it("throws when the supplier does not carry the pump", () => {
    expect(() => quote("evergreen-ppo", "cradle-supply", "orchard-clinical")).toThrow(
      "cradle-supply does not carry orchard-clinical",
    );
  });
});

describe("quotesForPlan", () => {
  it("returns one quote per supplier offering", () => {
    const offeringCount = suppliers.reduce((n, s) => n + s.offerings.length, 0);
    expect(quotesForPlan("summit-epo")).toHaveLength(offeringCount);
  });

  it("is deterministic across calls", () => {
    expect(quotesForPlan("evergreen-ppo")).toEqual(quotesForPlan("evergreen-ppo"));
  });

  it("always splits list price exactly between insurer and member", () => {
    for (const plan of plans) {
      for (const q of quotesForPlan(plan.id)) {
        expect(q.insurancePaysCents).toBeGreaterThanOrEqual(0);
        expect(q.outOfPocketCents).toBeGreaterThanOrEqual(0);
        expect(q.insurancePaysCents + q.outOfPocketCents).toBe(q.listPriceCents);
      }
    }
  });
});

describe("rankQuotes", () => {
  it("orders in stock, then coverage, then member cost, then shipping", () => {
    const ranked = rankQuotes(quotesForPlan("evergreen-ppo"));
    const firstOutOfStock = ranked.findIndex((q) => !q.inStock);
    expect(ranked.slice(firstOutOfStock).every((q) => !q.inStock)).toBe(true);

    const order = ["fully-covered", "upgrade", "not-covered"];
    const statusRanks = ranked.slice(0, firstOutOfStock).map((q) => order.indexOf(q.status));
    expect(statusRanks).toEqual([...statusRanks].sort((a, b) => a - b));

    // $0 + 2-day shipping ties are broken by supplier id, then pump id.
    expect(ranked[0]).toMatchObject({ supplierId: "first-feed", pumpId: "kestrel-pocket" });
  });

  it("does not mutate its input", () => {
    const quotes = quotesForPlan("evergreen-ppo");
    const copy = [...quotes];
    rankQuotes(quotes);
    expect(quotes).toEqual(copy);
  });
});

describe("findFreeOffers", () => {
  it("returns only eligible, in-stock $0 offers, ranked", () => {
    for (const plan of plans) {
      const result = findFreeOffers(plan.id, { pumpTypes: [] });
      expect(result.outcome).toBe("free_offers_found");
      for (const q of result.offers) {
        expect(q).toMatchObject({ status: "fully-covered", inStock: true, outOfPocketCents: 0 });
      }
      expect(result.offers).toEqual(rankQuotes(result.offers));
    }
  });

  it("excludes an in-stock eligible offer that costs money", () => {
    const { offers } = findFreeOffers("evergreen-ppo", { pumpTypes: ["double-electric"] });
    expect(offers).not.toContainEqual(
      expect.objectContaining({ supplierId: "mama-mend", pumpId: "nestlark-classic" }),
    );
  });

  it("returns no_free_offers with an empty list instead of recommending paid upgrades", () => {
    // Every in-network Evergreen wearable is an in-stock paid upgrade.
    const paidWearables = quotesForPlan("evergreen-ppo").filter(
      (q) => getPump(q.pumpId).type === "wearable" && q.status === "upgrade" && q.inStock,
    );
    expect(paidWearables.length).toBeGreaterThan(0);

    expect(findFreeOffers("evergreen-ppo", { pumpTypes: ["wearable"] })).toEqual({
      outcome: "no_free_offers",
      offers: [],
    });
  });

  it("returns no_free_offers when nothing matching is insurance-eligible", () => {
    expect(findFreeOffers("bayview-medicaid", { pumpTypes: ["wearable"] })).toEqual({
      outcome: "no_free_offers",
      offers: [],
    });
  });

  it("returns coverage_unverified for an unknown plan instead of throwing", () => {
    expect(findFreeOffers("unknown-plan", { pumpTypes: [] })).toEqual({
      outcome: "coverage_unverified",
      reason: "unknown_plan",
      offers: [],
    });
  });

  it("returns coverage_unverified on a simulated verification failure, even when free offers exist", () => {
    expect(
      findFreeOffers("evergreen-ppo", { pumpTypes: [] }, { simulateVerificationFailure: true }),
    ).toEqual({ outcome: "coverage_unverified", reason: "verification_failed", offers: [] });
  });
});

describe("formatCents", () => {
  it("formats as US dollars", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(7500)).toBe("$75.00");
    expect(formatCents(120000)).toBe("$1,200.00");
  });
});
