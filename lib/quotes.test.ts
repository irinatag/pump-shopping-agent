import { describe, expect, it } from "vitest";
import { getPlan, getPump, getSupplier, suppliers } from "@/lib/catalog";
import { formatCents, supplierPriceCents } from "@/lib/pricing";
import { quoteOffer, quotesForPlan } from "@/lib/quotes";

const quote = (planId: string, supplierId: string, pumpId: string) =>
  quoteOffer(getPlan(planId), getSupplier(supplierId), getPump(pumpId));

describe("supplierPriceCents", () => {
  it("applies the supplier adjustment and rounds to whole cents", () => {
    expect(supplierPriceCents(getSupplier("cradle-supply"), getPump("lunaria-duo"))).toBe(19900);
    expect(supplierPriceCents(getSupplier("little-latch"), getPump("kestrel-glide"))).toBe(31913);
    expect(supplierPriceCents(getSupplier("mama-mend"), getPump("lunaria-duo"))).toBe(20895);
  });
});

describe("quoteOffer", () => {
  it("charges nothing when fully covered", () => {
    expect(quote("evergreen-ppo", "cradle-supply", "lunaria-duo")).toMatchObject({
      status: "fully-covered",
      supplierPriceCents: 19900,
      insurancePaysCents: 19900,
      outOfPocketCents: 0,
    });
  });

  it("charges the difference above the allowance for an upgrade", () => {
    expect(quote("evergreen-ppo", "cradle-supply", "nestlark-free")).toMatchObject({
      status: "upgrade",
      insurancePaysCents: 25000,
      outOfPocketCents: 14900,
    });
  });

  it("adds the supplier handling fee to upgrades only", () => {
    // $335.58 - $250 allowance + $15 fee
    expect(quote("evergreen-ppo", "milkway-medical", "kestrel-glide").outOfPocketCents).toBe(10058);
    expect(quote("evergreen-ppo", "milkway-medical", "nestlark-classic").outOfPocketCents).toBe(0);
  });

  it("charges full price when not covered", () => {
    expect(quote("evergreen-ppo", "willow-lane", "willowmere-pro")).toMatchObject({
      status: "not-covered",
      insurancePaysCents: 0,
      outOfPocketCents: 47405,
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

  it("always splits the price between insurer and member without going negative", () => {
    for (const q of quotesForPlan("summit-epo")) {
      expect(q.insurancePaysCents).toBeGreaterThanOrEqual(0);
      expect(q.outOfPocketCents).toBeGreaterThanOrEqual(0);
      expect(q.insurancePaysCents + q.outOfPocketCents).toBeGreaterThanOrEqual(q.supplierPriceCents);
    }
  });
});

describe("formatCents", () => {
  it("formats as US dollars", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(14900)).toBe("$149.00");
    expect(formatCents(120000)).toBe("$1,200.00");
  });
});
