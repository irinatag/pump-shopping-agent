import { describe, expect, it } from "vitest";
import { buildGroundingContext, getProductFacts, GROUNDING_RULES } from "@/lib/grounding";
import { getProduct, products, sources } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { SimulatedQuoteProvider } from "@/lib/offers/simulated/provider";
import { SIMULATED_LABEL } from "@/lib/offers/types";

describe("getProductFacts", () => {
  it("accounts for every attribute exactly once across verified, conflicting, and unknown", () => {
    for (const p of products) {
      const f = getProductFacts(p.id);
      const all = [...f.verified, ...f.conflicting, ...f.unknown].map((x) => x.attribute).sort();
      expect(all).toEqual([...ATTRIBUTE_KEYS].sort());
    }
  });

  it("only exposes verified values with citations that resolve to catalog sources", () => {
    const urls = new Set(sources.map((s) => s.url));
    for (const p of products) {
      for (const fact of getProductFacts(p.id).verified) {
        expect(fact.citations.length).toBeGreaterThan(0);
        for (const c of fact.citations) expect(urls).toContain(c.url);
      }
    }
  });

  it("surfaces conflicts and unknowns instead of picking a value", () => {
    const roam = getProductFacts("motif-roam");
    expect(roam.conflicting.map((c) => c.attribute)).toContain("batteryLife");
    expect(roam.verified.map((v) => v.attribute)).not.toContain("batteryLife");

    const s1 = getProductFacts("spectra-s1-plus");
    expect(s1.unknown.map((u) => u.attribute)).toContain("closedSystem");
  });

  it("contains no price, coverage, or shipping data", () => {
    const json = JSON.stringify(products.map((p) => getProductFacts(p.id)), (k, v) => (k === "quote" || k === "note" ? undefined : v));
    expect(json).not.toMatch(/Cents|shipping|inStock|insurance/);
  });
});

describe("buildGroundingContext", () => {
  it("keeps product facts and offers in separate sections, with offer provenance and values verbatim", async () => {
    const r = await new SimulatedQuoteProvider().getQuotes({ planId: "evergreen-ppo", productIds: ["medela-pump-in-style-pro"] });
    if (r.status !== "ok") throw new Error(r.status);
    const ctx = buildGroundingContext({ productIds: ["medela-pump-in-style-pro"], quotes: r.quotes });

    expect(ctx.rules).toEqual(GROUNDING_RULES);
    expect(ctx.products).toHaveLength(1);
    expect(ctx.offers).toHaveLength(r.quotes.length);
    ctx.offers.forEach((o, i) => {
      expect(o.provenance).toEqual({ kind: "simulated", providerId: "simulated", label: SIMULATED_LABEL });
      expect(o.charges).toEqual(r.quotes[i].charges);
      expect(o.inStock).toBe(r.quotes[i].inStock);
    });
    expect(ctx.offers.map((o) => o.supplierName)).toContain("MamaMend Medical");
    expect(getProduct(ctx.products[0].productId).model).toBe("Pump In Style Pro");
  });

  it("includes no offers when none are supplied", () => {
    expect(buildGroundingContext({ productIds: ["willow-go"] }).offers).toEqual([]);
  });
});
