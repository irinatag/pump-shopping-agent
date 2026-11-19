import { describe, expect, it } from "vitest";
import { baseProducts, getProduct, products, sources } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { classifyProduct } from "@/lib/products/classification";
import { sourceQuotes } from "@/lib/products/evidence";
import type { Attribute, PumpCategory } from "@/lib/products/types";

const unique = (xs: string[]) => new Set(xs).size === xs.length;
const attributes = (p: (typeof products)[number]) =>
  ATTRIBUTE_KEYS.map((key) => [key, p[key] as Attribute<unknown>] as const);

const MANUFACTURER_HOSTS = [
  "www.medela.com",
  "www.spectrababyusa.com",
  "motifmedical.com",
  "lansinoh.com",
  "momcozy.com",
  "onewillow.com",
  "elvie.com",
  "www.ameda.com",
  "zomee.com",
  "babybuddhaproducts.com",
  "www.evenflofeeding.com",
  "www.eufy.com",
];

describe("product catalog", () => {
  it("contains at least 50 distinct real models", () => {
    expect(products.length).toBeGreaterThanOrEqual(50);
  });

  it("has unique ids and unique brand + model names (deduplicated)", () => {
    expect(unique(products.map((p) => p.id))).toBe(true);
    expect(unique(products.map((p) => `${p.brand}|${p.model}`.toLowerCase()))).toBe(true);
  });

  it("marks variants explicitly and points them at an existing base model", () => {
    for (const p of products.filter((x) => x.variantOf)) {
      expect(() => getProduct(p.variantOf!)).not.toThrow();
      expect(p.variantOf).not.toBe(p.id);
    }
  });

  it("is US-market and backed by at least one manufacturer page", () => {
    for (const p of products) {
      expect(p.market).toBe("US");
      expect(p.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("covers a useful variety of derived pump categories", () => {
    const categories = new Set(products.flatMap((p) => {
      const c = classifyProduct(p);
      return c.status === "derived" ? [c.category] : [];
    }));
    const expected: PumpCategory[] = ["flange-bottle-electric", "hands-free-electric", "wearable", "manual", "multi-user"];
    for (const c of expected) expect(categories).toContain(c);
  });

  it("defines every attribute on every product, explicitly unknown when unsupported", () => {
    for (const p of products) {
      for (const [key, a] of attributes(p)) {
        expect(a, `${p.id}.${key}`).toBeDefined();
        expect(["verified", "inferred", "conflicting", "not-applicable", "unknown"]).toContain(a.status);
      }
    }
  });
});

describe("source provenance", () => {
  it("lists each source once with an https manufacturer URL and a valid access date", () => {
    expect(unique(sources.map((s) => s.id))).toBe(true);
    expect(unique(sources.map((s) => s.url))).toBe(true);
    for (const s of sources) {
      const url = new URL(s.url);
      expect(url.protocol).toBe("https:");
      expect(MANUFACTURER_HOSTS, s.url).toContain(url.host);
      expect(["manufacturer-page", "manufacturer-manual"]).toContain(s.kind);
      expect(s.accessedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(s.accessedOn))).toBe(false);
    }
  });

  it("uses every source and references only declared sources", () => {
    const declared = new Set(sources.map((s) => s.id));
    const used = new Set<string>();
    for (const p of products) {
      for (const id of p.sourceIds) {
        expect(declared, `${p.id} → ${id}`).toContain(id);
        used.add(id);
      }
      for (const [key, a] of attributes(p)) {
        const evidence =
          a.status === "verified" || a.status === "inferred" || a.status === "not-applicable"
            ? a.evidence
            : a.status === "conflicting"
              ? a.candidates.map((c) => c.evidence)
              : [];
        for (const e of sourceQuotes(evidence)) expect(p.sourceIds, `${p.id}.${key} cites ${e.sourceId}`).toContain(e.sourceId);
      }
    }
    expect([...declared].filter((id) => !used.has(id))).toEqual([]);
  });

  it("supports every verified, inferred and not-applicable attribute with non-empty evidence", () => {
    for (const p of products) {
      for (const [key, a] of attributes(p)) {
        if (a.status !== "verified" && a.status !== "inferred" && a.status !== "not-applicable") continue;
        expect(a.evidence.length, `${p.id}.${key}`).toBeGreaterThan(0);
        for (const e of a.evidence) {
          // A verbatim quote; or a research row with its stated value and summary; or an owner decision's statement.
          const text = e.kind === "research" ? e.stated && e.summary : e.kind === "owner-decision" ? e.statement : e.quote;
          expect(text.trim().length, `${p.id}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("establishes every product's mechanism, and its collection configuration except where explicitly unknown", () => {
    for (const p of products) expect(["verified", "inferred"], p.id).toContain(p.mechanism.status);
    // Since the 2026-11-12 research package every collection is established (Pearl, Platinum and
    // Symphony PLUS: kit-sold-separately). Hand-written records left unknown must say why.
    for (const p of products) expect(["verified", "inferred"], p.id).toContain(p.collection.status);
    for (const p of baseProducts.filter((x) => x.collection.status === "unknown")) expect(p.collection, p.id).toHaveProperty("note");
  });
});

describe("missing and conflicting attributes", () => {
  it("records conflicts with a note and at least two differing sourced candidates", () => {
    // The hand-written records carry the conflicts; the research package settles all of them by rule.
    const conflicts = [...baseProducts, ...products].flatMap((p) => attributes(p).filter(([, a]) => a.status === "conflicting").map(([k, a]) => ({ p, k, a })));
    expect(conflicts.length).toBeGreaterThan(0);
    for (const { p, k, a } of conflicts) {
      if (a.status !== "conflicting") continue;
      expect(a.note.length, `${p.id}.${k}`).toBeGreaterThan(0);
      expect(a.candidates.length).toBeGreaterThanOrEqual(2);
      const values = new Set(a.candidates.map((c) => JSON.stringify(c.value)));
      expect(values.size, `${p.id}.${k} candidates must differ`).toBeGreaterThan(1);
    }
  });

  it("never carries a value on an unknown attribute", () => {
    for (const p of products) {
      for (const [key, a] of attributes(p)) {
        if (a.status === "unknown") expect("value" in a, `${p.id}.${key}`).toBe(false);
      }
    }
  });

  it("keeps numeric measures positive and in plausible ranges", () => {
    for (const p of products) {
      if (p.maxSuction.status === "verified") expect(p.maxSuction.value.amount).toBeGreaterThan(0);
      if (p.maxSuction.status === "verified") expect(p.maxSuction.value.amount).toBeLessThanOrEqual(400);
      if (p.noise.status === "verified") expect(p.noise.value.amount).toBeLessThan(80);
      if (p.batteryLife.status === "verified") expect(p.batteryLife.value.amount).toBeGreaterThan(0);
      if (p.weight.status === "verified") expect(p.weight.value.amount).toBeGreaterThan(0);
    }
  });
});

describe("domain separation", () => {
  const FORBIDDEN = /price|cents|cost|shipping|stock|inventory|coverage|covered|insurance|eligib|copay|deductible|allowance/i;

  it("stores no prices, shipping, inventory, or insurance fields on products", () => {
    const walk = (value: unknown, path: string) => {
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          // Quotes are verbatim source text and may mention these words; keys may not.
          expect(FORBIDDEN.test(k), `${path}.${k}`).toBe(false);
          if (k !== "quote" && k !== "note") walk(v, `${path}.${k}`);
        }
      }
    };
    for (const p of products) walk(p, p.id);
  });
});
