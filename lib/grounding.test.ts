import { describe, expect, it } from "vitest";
import { buildGroundingContext, getProductFacts, GROUNDING_RULES, isQuoteCitation } from "@/lib/grounding";
import { getProduct, products, sources } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { SimulatedQuoteProvider } from "@/lib/offers/simulated/provider";
import { SIMULATED_LABEL } from "@/lib/offers/types";

describe("getProductFacts", () => {
  it("accounts for every attribute exactly once across verified, inferred, conflicting, not applicable and unknown", () => {
    for (const p of products) {
      const f = getProductFacts(p.id);
      const all = [...f.verified, ...f.inferred, ...f.conflicting, ...f.notApplicable, ...f.unknown].map((x) => x.attribute).sort();
      expect(all).toEqual([...ATTRIBUTE_KEYS].sort());
    }
  });

  it("only exposes verified values with citations: quotes resolve to catalog sources; research rows name their class", () => {
    const urls = new Set(sources.map((s) => s.url));
    for (const p of products) {
      for (const fact of getProductFacts(p.id).verified) {
        expect(fact.citations.length).toBeGreaterThan(0);
        for (const c of fact.citations) {
          if (isQuoteCitation(c)) expect(urls).toContain(c.url);
          else if (c.kind === "research") expect(["manufacturer", "owner-verified"]).toContain(c.evidenceClass);
        }
      }
    }
  });

  it("passes a rule-settled conflict as inferred with the other value, and keeps unknowns unknown", () => {
    const roam = getProductFacts("motif-roam");
    const life = roam.inferred.find((f) => f.attribute === "batteryLife")!;
    expect(life.value).toEqual({ amount: 120, unit: "min", comparator: "approximately" });
    expect(life.ruleResolution?.basis).toBe("weight-of-evidence");
    expect(life.ruleResolution?.alternatives.map((a) => a.value)).toEqual([{ amount: 90, unit: "min", comparator: "up-to" }]);
    expect(roam.verified.map((v) => v.attribute)).not.toContain("batteryLife");

    const trad = getProductFacts("medela-pump-in-style-pro-plus-traditional");
    expect(trad.unknown.map((u) => u.attribute)).toContain("batterySessions");
  });

  it("separates inferred facts, with their rationale, from verified facts", () => {
    const sg = getProductFacts("spectra-synergy-gold");
    const closed = sg.inferred.find((f) => f.attribute === "closedSystem");
    expect(closed?.value).toBe(true);
    expect(closed?.rationale.length).toBeGreaterThan(0);
    expect(sg.verified.map((v) => v.attribute)).not.toContain("closedSystem");
  });

  it("passes not-applicable attributes with their reason, apart from unknowns", () => {
    const manual = getProductFacts("ameda-one-hand-manual");
    expect(manual.notApplicable.find((f) => f.attribute === "batteryLife")?.reason).toBe("manual-pump");
    expect(manual.unknown.map((u) => u.attribute)).not.toContain("batteryLife");
  });

  it("reports the derived classification and flags cross-page citations", () => {
    expect(getProductFacts("medela-pump-in-style-pro").classification).toMatchObject({ status: "derived", category: "flange-bottle-electric" });
    expect(getProductFacts("momcozy-m6-mobile-style").classification.status).toBe("derived");
    const fit = getProductFacts("zomee-fit").verified.find((f) => f.attribute === "closedSystem")!;
    expect(fit.citations.filter(isQuoteCitation).map((c) => c.scope)).toContain("brand-wide");
  });

  it("contains no price, coverage, or shipping data", () => {
    // Free text may mention those words (e.g. "retailer or insurance supplier", "shipping weight"); data fields may not.
    const text = new Set(["quote", "note", "rationale", "summary", "limitations", "stated", "keyQuote", "statement"]);
    const json = JSON.stringify(products.map((p) => getProductFacts(p.id)), (k, v) => (text.has(k) ? undefined : v));
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
