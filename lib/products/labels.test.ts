import { describe, expect, it } from "vitest";
import { getProduct, products } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { factLabel, type FactLabelKind } from "@/lib/products/labels";
import type { Attribute, ProductAttributeKey } from "@/lib/products/types";

const label = (id: string, k: ProductAttributeKey) => factLabel(getProduct(id)[k] as Attribute<unknown>);
const all = products.flatMap((p) => ATTRIBUTE_KEYS.map((k) => ({ id: p.id, k, a: p[k] as Attribute<unknown> })));

describe("fact labels", () => {
  it("gives each status only its own label kinds", () => {
    const allowed: Record<Attribute<unknown>["status"], FactLabelKind[]> = {
      verified: ["manufacturer-verified", "owner-verified"],
      inferred: ["rule-resolved", "retailer-listed", "derived", "interpreted"],
      "not-applicable": ["not-applicable"],
      conflicting: ["conflicting"],
      unknown: ["unknown"],
    };
    for (const { id, k, a } of all) expect(allowed[a.status], `${id}.${k}`).toContain(factLabel(a).kind);
  });

  it("never labels a value with owner evidence as a manufacturer statement", () => {
    for (const { id, k, a } of all) {
      if (a.status !== "verified") continue;
      const owner = a.evidence.some((e) => e.kind === "owner-decision" || (e.kind === "research" && e.evidenceClass === "owner-verified"));
      if (owner) expect(factLabel(a).kind, `${id}.${k}`).toBe("owner-verified");
    }
    expect(label("ameda-mya-joy-plus", "powerSources")).toEqual({ kind: "owner-verified", text: "Verified by PumpPath, not a manufacturer statement" });
    expect(label("willow-wave", "handsFree").kind).toBe("owner-verified");
  });

  it("labels manufacturer-only verified values as manufacturer statements", () => {
    expect(label("medela-sonata", "powerSources")).toEqual({ kind: "manufacturer-verified", text: "Manufacturer statement" });
  });

  it("labels the eight rule-settled conflicts, retailer listings and derived values", () => {
    expect(all.filter(({ a }) => factLabel(a).kind === "rule-resolved")).toHaveLength(8);
    expect(label("medela-sonata", "batteryLife").kind).toBe("rule-resolved");
    expect(label("motif-manual-silicone", "weight").kind).toBe("retailer-listed");
    expect(label("spectra-synergy-gold-portable", "handsFree").kind).toBe("derived");
  });

  it("states the not-applicable reason, including the shared replaceable-battery wording", () => {
    expect(label("ameda-one-hand-manual", "batteryLife")).toEqual({ kind: "not-applicable", text: "Not applicable (manual pump)" });
    expect(label("ameda-mya-joy", "batteryLife").text).toBe("Not applicable (runs on replaceable batteries)");
  });
});
