import { describe, expect, it } from "vitest";
import { findFreeOffers, isQualifyingFreeOffer, rankQuotes } from "@/lib/offers/search";
import { simulatedPlans } from "@/lib/offers/simulated/data";
import { SimulatedQuoteProvider } from "@/lib/offers/simulated/provider";
import type { Quote, QuoteProvider, QuoteResponse } from "@/lib/offers/types";

const simulated = new SimulatedQuoteProvider();

/** A stand-in for a future authorized supplier integration. */
class FakeSupplierApiProvider implements QuoteProvider {
  readonly id = "fake-supplier-api";
  readonly provenance = "supplier-api" as const;
  constructor(private readonly quotes: Quote[]) {}
  async getQuotes(): Promise<QuoteResponse> {
    return { status: "ok", quotes: this.quotes };
  }
}

function apiQuote(overrides: Partial<Omit<Quote, "charges">> & { charges?: Partial<Quote["charges"]> } = {}): Quote {
  const { charges, ...rest } = overrides;
  return {
    provenance: { kind: "supplier-api", providerId: "fake-supplier-api", supplierId: "aeroflow", retrievedAt: "2026-10-28T00:00:00Z", reference: "q-1" },
    planId: "real-plan",
    supplierId: "aeroflow",
    productId: "spectra-s1-plus",
    status: "fully-covered",
    reasons: [],
    listPriceCents: null,
    insurancePaysCents: null,
    charges: { pumpOutOfPocketCents: 0, shippingCents: 0, otherMandatoryCents: 0, totalOutOfPocketCents: 0, ...charges },
    inStock: true,
    shippingDays: 3,
    ...rest,
  };
}

describe("isQualifyingFreeOffer", () => {
  it("accepts only confirmed, in-stock offers with every charge a known $0", () => {
    expect(isQualifyingFreeOffer(apiQuote())).toBe(true);
  });

  it.each([
    ["an upgrade", apiQuote({ status: "upgrade", charges: { pumpOutOfPocketCents: 7500, totalOutOfPocketCents: 7500 } })],
    ["out of stock", apiQuote({ inStock: false })],
    ["unknown stock", apiQuote({ inStock: null })],
    ["unverified coverage", apiQuote({ status: "unverified" })],
    ["a shipping fee", apiQuote({ charges: { shippingCents: 995, totalOutOfPocketCents: 995 } })],
    ["unknown shipping", apiQuote({ charges: { shippingCents: null, totalOutOfPocketCents: null } })],
    ["unknown other charges", apiQuote({ charges: { otherMandatoryCents: null } })],
    ["another mandatory charge", apiQuote({ charges: { otherMandatoryCents: 500, totalOutOfPocketCents: 500 } })],
  ])("rejects %s", (_label, q) => {
    expect(isQualifyingFreeOffer(q)).toBe(false);
  });
});

describe("findFreeOffers", () => {
  it("returns only qualifying $0 offers for every simulated plan", async () => {
    for (const p of simulatedPlans) {
      const result = await findFreeOffers(simulated, p.id, { categories: [] });
      expect(result.outcome).toBe("free_offers_found");
      for (const q of result.offers) expect(isQualifyingFreeOffer(q)).toBe(true);
      expect(result.offers).toEqual(rankQuotes(result.offers));
    }
  });

  it("never falls back to paid upgrades when no $0 offer matches", async () => {
    // Every in-stock simulated wearable under Evergreen is a paid upgrade.
    expect(await findFreeOffers(simulated, "evergreen-ppo", { categories: ["wearable"] })).toEqual({
      outcome: "no_free_offers",
      offers: [],
    });
  });

  it("returns no_free_offers when nothing matching is eligible at all", async () => {
    expect(await findFreeOffers(simulated, "bayview-medicaid", { categories: ["wearable"] })).toEqual({
      outcome: "no_free_offers",
      offers: [],
    });
  });

  it("distinguishes unverified coverage from ineligibility", async () => {
    expect(await findFreeOffers(simulated, "unknown-plan", { categories: [] })).toEqual({
      outcome: "coverage_unverified",
      reason: "unknown_plan",
      offers: [],
    });
    expect(await findFreeOffers(new SimulatedQuoteProvider({ failVerification: true }), "evergreen-ppo", { categories: [] })).toEqual({
      outcome: "coverage_unverified",
      reason: "verification_failed",
      offers: [],
    });
  });
});

describe("quote provider interface", () => {
  it("works unchanged with a future supplier-api provider", async () => {
    const free = apiQuote();
    const unknownShipping = apiQuote({ productId: "spectra-s2-plus", charges: { shippingCents: null, totalOutOfPocketCents: null } });
    const result = await findFreeOffers(new FakeSupplierApiProvider([unknownShipping, free]), "real-plan", { categories: [] });
    expect(result).toEqual({ outcome: "free_offers_found", offers: [free] });
  });

  it("preserves provenance so simulated and real quotes cannot be confused", async () => {
    const real = await findFreeOffers(new FakeSupplierApiProvider([apiQuote()]), "real-plan", { categories: [] });
    expect(real.offers.every((q) => q.provenance.kind === "supplier-api" && !("label" in q.provenance))).toBe(true);

    const sim = await findFreeOffers(simulated, "evergreen-ppo", { categories: [] });
    expect(sim.offers.every((q) => q.provenance.kind === "simulated")).toBe(true);
  });
});
