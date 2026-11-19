import { describe, expect, it } from "vitest";
import { getProductFacts, isQuoteCitation } from "@/lib/grounding";
import { sourceQuotes } from "@/lib/products/evidence";
import { baseProducts, getProduct, getSource } from "@/lib/products";
import { classifyProduct } from "@/lib/products/classification";
import type { Attribute } from "@/lib/products/types";

// Regression tests for the three FAIL findings of docs/CATALOG_TRUST_REPORT.md (N-01, N-04, N-05),
// corrected 2026-11-11. Each pins the corrected value, its source, and what grounding shows Claude.

const SONATA_IFU = "https://www.medela.com/010-products/010-pumps/020-classic-electric/070-sonata-smart-breast-pump/pdf-downloads/sonata-instruction-manual.pdf";
const PRO_PLUS_IFU = "https://www.medela.com/010-products/010-pumps/010-hands-free-electric/060-pump-in-style-pro-plus/pdfs/instructions-for-use-pns-pro-plus.pdf";

const verified = <T>(a: Attribute<T>) => {
  expect(a.status).toBe("verified");
  return a as Extract<Attribute<T>, { status: "verified" }>;
};

describe("N-01 Medela Sonata power and runtime", () => {
  const sonata = getProduct("medela-sonata");

  it("records both operating modes in the multi-value list, sourced from the instructions for use", () => {
    const ps = verified(sonata.powerSources);
    expect([...ps.value].sort()).toEqual(["built-in-battery", "mains"]);
    const manualQuotes = sourceQuotes(ps.evidence).filter((e) => getSource(e.sourceId).url === SONATA_IFU).map((e) => e.quote);
    expect(getSource("medela-sonata-ifu").kind).toBe("manufacturer-manual");
    expect(manualQuotes).toContain("There are two ways to power your breast pump for your pumping session:");
    expect(manualQuotes.some((q) => /plug power cord into power source/i.test(q))).toBe(true);
    expect(manualQuotes.some((q) => /rechargeable battery/i.test(q))).toBe(true);
  });

  it("recorded battery runtime as conflicting (1.5 hours vs up to an hour) in the hand-written record", () => {
    const b = baseProducts.find((p) => p.id === "medela-sonata")!.batteryLife;
    expect(b.status).toBe("conflicting");
    if (b.status !== "conflicting") return;
    expect(b.candidates.map((c) => c.value)).toEqual([
      { amount: 90, unit: "min", comparator: "eq" },
      { amount: 60, unit: "min", comparator: "up-to" },
    ]);
    expect(b.candidates.every((c) => sourceQuotes([c.evidence])[0]?.sourceId === "medela-sonata")).toBe(true);
  });

  it("has that conflict settled by the owner rule (2026-11-12 package), keeping 1.5 hours as the alternative", () => {
    const b = sonata.batteryLife;
    expect(b).toMatchObject({ status: "inferred", value: { amount: 60, unit: "min", comparator: "up-to" } });
    if (b.status !== "inferred") return;
    expect(b.ruleResolution?.alternatives).toEqual([{ value: { amount: 90, unit: "min", comparator: "eq" }, evidence: [{ sourceId: "medela-sonata", quote: "with 1.5 hours of battery life" }] }]);
  });

  it("is still a flange-and-bottle electric pump", () => {
    expect(classifyProduct(sonata)).toMatchObject({ status: "derived", category: "flange-bottle-electric" });
  });
});

describe("N-04 Medela Pump In Style Pro+ Traditional weight", () => {
  const trad = getProduct("medela-pump-in-style-pro-plus-traditional");

  it("records the exact pump-unit weight from the Pro+ instructions for use linked from its own page", () => {
    const w = verified(trad.weight);
    expect(w.value).toEqual({ amount: 715, unit: "g", comparator: "eq", scope: "motor" });
    expect(w.evidence).toEqual([{ sourceId: "medela-pis-pro-plus-ifu", quote: "Weight (pump unit) 1.57 lbs (715 g)" }]);
    expect(getSource("medela-pis-pro-plus-ifu")).toMatchObject({ url: PRO_PLUS_IFU, kind: "manufacturer-manual" });
    expect(trad.sourceIds).toContain("medela-pis-pro-plus-ifu");
  });

  it("leaves the Hands-free configuration's own record unchanged", () => {
    const hf = verified(getProduct("medela-pump-in-style-pro-plus-hands-free").weight);
    expect(hf.value).toEqual({ amount: 2, unit: "lb", comparator: "lt", scope: "motor" });
  });

  it("is still a flange-and-bottle electric pump", () => {
    expect(classifyProduct(trad)).toMatchObject({ status: "derived", category: "flange-bottle-electric" });
  });
});

describe("N-05 BabyBuddha 3.0 pumping modes", () => {
  const bb = getProduct("babybuddha-3");

  it("lists all four modes with their setting counts, totalling 30", () => {
    const s = verified(bb.suctionLevels);
    const modes = [...s.value.matchAll(/(Soft Stimulation|Classic Expression|Double Drop Expression|Classic Stimulation) (\d+)/g)];
    expect(modes.map((m) => [m[1], Number(m[2])])).toEqual([
      ["Soft Stimulation", 6],
      ["Classic Expression", 9],
      ["Double Drop Expression", 9],
      ["Classic Stimulation", 6],
    ]);
    expect(modes.reduce((n, m) => n + Number(m[2]), 0)).toBe(30);
    expect(s.value).toMatch(/^4 modes, 30 settings/);
    expect(sourceQuotes(s.evidence).map((e) => e.quote)).toContain("Choose from four pumping modes and 30 total settings:");
    expect(sourceQuotes(s.evidence).map((e) => e.quote)).toContain("Classic Stimulation with 6 levels");
  });

  it("keeps the 3.0 page's suction range rather than the 2.0's 320 mmHg ceiling", () => {
    const m = verified(bb.maxSuction);
    expect(m.value).toEqual({ amount: 315, unit: "mmHg", comparator: "up-to" });
  });
});

describe("grounding reflects the corrections", () => {
  it("passes Sonata's power list as verified and its runtime as rule-settled, never verified", () => {
    const f = getProductFacts("medela-sonata");
    const ps = f.verified.find((x) => x.attribute === "powerSources")!;
    expect([...(ps.value as string[])].sort()).toEqual(["built-in-battery", "mains"]);
    expect(ps.citations.filter(isQuoteCitation).some((c) => c.url === SONATA_IFU && c.scope === "this-product")).toBe(true);
    expect(f.verified.map((x) => x.attribute)).not.toContain("batteryLife");
    expect(f.inferred.find((x) => x.attribute === "batteryLife")!.ruleResolution?.alternatives).toHaveLength(1);
  });

  it("passes the Pro+ Traditional weight as a verified manual citation", () => {
    const f = getProductFacts("medela-pump-in-style-pro-plus-traditional");
    const w = f.verified.find((x) => x.attribute === "weight")!;
    expect(w.value).toEqual({ amount: 715, unit: "g", comparator: "eq", scope: "motor" });
    expect(w.citations).toEqual([
      { url: PRO_PLUS_IFU, publisher: "Medela", accessedOn: "2026-11-11", quote: "Weight (pump unit) 1.57 lbs (715 g)", scope: "this-product", section: "product-content" },
    ]);
    expect(f.unknown.map((x) => x.attribute)).not.toContain("weight");
  });

  it("passes all four BabyBuddha 3.0 modes", () => {
    const s = getProductFacts("babybuddha-3").verified.find((x) => x.attribute === "suctionLevels")!;
    expect(s.value).toContain("Classic Stimulation 6");
  });
});
