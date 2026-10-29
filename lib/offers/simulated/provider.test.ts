import { describe, expect, it } from "vitest";
import { getProduct } from "@/lib/products";
import { getSimulatedSupplier, realSuppliers } from "@/lib/suppliers";
import { coverageOverrides, SIMULATED_SHIPPING_CENTS, simulatedOfferings, simulatedPlans } from "@/lib/offers/simulated/data";
import { SimulatedQuoteProvider, simulateQuote } from "@/lib/offers/simulated/provider";
import { SIMULATED_LABEL, type Quote } from "@/lib/offers/types";

const provider = new SimulatedQuoteProvider();

async function quotes(planId: string): Promise<Quote[]> {
  const r = await provider.getQuotes({ planId });
  if (r.status !== "ok") throw new Error(r.status);
  return r.quotes;
}

const plan = (id: string) => simulatedPlans.find((p) => p.id === id)!;
const offering = (supplierId: string, productId: string) =>
  simulatedOfferings.find((o) => o.supplierId === supplierId && o.productId === productId)!;
const quote = (planId: string, supplierId: string, productId: string) =>
  simulateQuote(plan(planId), getSimulatedSupplier(supplierId), offering(supplierId, productId), "simulated");

describe("simulated offer data", () => {
  it("only offers real catalog products through simulated suppliers", () => {
    const realIds = new Set(realSuppliers.map((s) => s.id));
    for (const o of simulatedOfferings) {
      expect(() => getProduct(o.productId)).not.toThrow();
      expect(() => getSimulatedSupplier(o.supplierId)).not.toThrow();
      expect(realIds.has(o.supplierId)).toBe(false);
      expect(Number.isInteger(o.listPriceCents)).toBe(true);
    }
  });

  it("only overrides offers that exist and are in network", () => {
    for (const o of coverageOverrides) {
      expect(offering(o.supplierId, o.productId)).toBeDefined();
      expect(getSimulatedSupplier(o.supplierId).inNetworkPlanIds).toContain(o.planId);
      expect(Number.isInteger(o.pumpOutOfPocketCents)).toBe(true);
    }
  });
});

describe("free shipping rule", () => {
  it("sets shipping to $0 on every simulated quote for every plan", async () => {
    expect(SIMULATED_SHIPPING_CENTS).toBe(0);
    for (const p of simulatedPlans) {
      for (const q of await quotes(p.id)) expect(q.charges.shippingCents, `${p.id}/${q.supplierId}/${q.productId}`).toBe(0);
    }
  });

  it("never makes shipping the reason for an out-of-pocket charge", async () => {
    for (const p of simulatedPlans) {
      for (const q of await quotes(p.id)) {
        if (q.charges.totalOutOfPocketCents === null) continue;
        expect(q.charges.totalOutOfPocketCents).toBe(q.charges.pumpOutOfPocketCents! + q.charges.otherMandatoryCents!);
      }
    }
  });

  it("keeps free shipping distinct from a free pump", () => {
    const paid = quote("evergreen-ppo", "mama-mend", "medela-pump-in-style-pro");
    expect(paid.charges.shippingCents).toBe(0);
    expect(paid.charges.totalOutOfPocketCents).toBe(7500);
  });
});

describe("simulated coverage decisions", () => {
  it("fully covers an in-network product priced within the allowance", () => {
    expect(quote("evergreen-ppo", "cradle-supply", "spectra-s2-plus")).toMatchObject({
      status: "fully-covered",
      reasons: [],
      listPriceCents: 19900,
      insurancePaysCents: 19900,
      charges: { pumpOutOfPocketCents: 0, shippingCents: 0, otherMandatoryCents: 0, totalOutOfPocketCents: 0 },
    });
  });

  it("charges the difference above the allowance as an upgrade", () => {
    expect(quote("evergreen-ppo", "cradle-supply", "willow-go")).toMatchObject({
      status: "upgrade",
      insurancePaysCents: 25000,
      charges: { pumpOutOfPocketCents: 14900, totalOutOfPocketCents: 14900 },
    });
  });

  it("applies the plan + supplier + product override, and only for that plan", () => {
    expect(quote("evergreen-ppo", "mama-mend", "medela-pump-in-style-pro")).toMatchObject({
      status: "upgrade",
      insurancePaysCents: 15400,
      charges: { pumpOutOfPocketCents: 7500 },
    });
    expect(quote("bayview-medicaid", "mama-mend", "medela-pump-in-style-pro").status).toBe("fully-covered");
  });

  it("rejects out-of-network suppliers, uncovered categories, and disallowed upgrades", () => {
    expect(quote("evergreen-ppo", "wren-lane", "spectra-s1-plus").reasons).toEqual(["out-of-network"]);
    expect(quote("harbor-hmo", "harborside-dme", "medela-symphony-plus").reasons).toContain("category-not-covered");
    expect(quote("bayview-medicaid", "cradle-supply", "spectra-s1-plus").reasons).toEqual(["upgrade-not-allowed"]);
  });

  it("returns unverified, with unknown charges, when the product's category is not verified", () => {
    const m6 = { supplierId: "cradle-supply", productId: "momcozy-m6-mobile-style", listPriceCents: 10000, inStock: true };
    const q = simulateQuote(plan("evergreen-ppo"), getSimulatedSupplier("cradle-supply"), m6, "simulated");
    expect(q.status).toBe("unverified");
    expect(q.reasons).toContain("category-unverified");
    expect(q.charges.totalOutOfPocketCents).toBeNull();
  });

  it("splits list price exactly between insurer and member", async () => {
    for (const p of simulatedPlans) {
      for (const q of await quotes(p.id)) expect(q.insurancePaysCents! + q.charges.pumpOutOfPocketCents!).toBe(q.listPriceCents);
    }
  });
});

describe("SimulatedQuoteProvider", () => {
  it("labels every quote as simulated", async () => {
    for (const q of await quotes("summit-epo")) {
      expect(q.provenance).toEqual({ kind: "simulated", providerId: "simulated", label: SIMULATED_LABEL });
    }
  });

  it("is deterministic", async () => {
    expect(await quotes("evergreen-ppo")).toEqual(await quotes("evergreen-ppo"));
  });

  it("returns one quote per offering and can filter by product", async () => {
    expect(await quotes("summit-epo")).toHaveLength(simulatedOfferings.length);
    const r = await provider.getQuotes({ planId: "summit-epo", productIds: ["willow-360"] });
    expect(r.status === "ok" && r.quotes.every((q) => q.productId === "willow-360")).toBe(true);
  });

  it("reports unknown plans and simulated verification failures instead of quoting", async () => {
    expect(await provider.getQuotes({ planId: "nope" })).toEqual({ status: "unknown_plan" });
    expect((await new SimulatedQuoteProvider({ failVerification: true }).getQuotes({ planId: "evergreen-ppo" })).status).toBe(
      "verification_failed",
    );
  });
});
