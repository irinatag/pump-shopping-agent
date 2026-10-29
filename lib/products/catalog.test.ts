import { describe, expect, it } from "vitest";
import { getProduct, products, sources } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
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

  it("covers a useful variety of pump categories", () => {
    const categories = new Set(
      products.flatMap((p) => (p.category.status === "verified" ? [p.category.value] : [])),
    );
    const expected: PumpCategory[] = ["traditional-electric", "portable-electric", "hands-free-electric", "wearable", "manual", "multi-user"];
    for (const c of expected) expect(categories).toContain(c);
  });

  it("defines every attribute on every product, explicitly unknown when unsupported", () => {
    for (const p of products) {
      for (const [key, a] of attributes(p)) {
        expect(a, `${p.id}.${key}`).toBeDefined();
        expect(["verified", "conflicting", "unknown"]).toContain(a.status);
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
        const evidence = a.status === "verified" ? a.evidence : a.status === "conflicting" ? a.candidates.map((c) => c.evidence) : [];
        for (const e of evidence) expect(p.sourceIds, `${p.id}.${key} cites ${e.sourceId}`).toContain(e.sourceId);
      }
    }
    expect([...declared].filter((id) => !used.has(id))).toEqual([]);
  });

  it("supports every verified attribute with at least one non-empty verbatim quote", () => {
    for (const p of products) {
      for (const [key, a] of attributes(p)) {
        if (a.status !== "verified") continue;
        expect(a.evidence.length, `${p.id}.${key}`).toBeGreaterThan(0);
        for (const e of a.evidence) expect(e.quote.trim().length, `${p.id}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("requires every product to have a verified category, except ones explicitly left unknown", () => {
    const unverified = products.filter((p) => p.category.status !== "verified").map((p) => p.id);
    expect(unverified).toEqual(["momcozy-m6-mobile-style"]);
  });
});

describe("missing and conflicting attributes", () => {
  it("records conflicts with a note and at least two differing sourced candidates", () => {
    const conflicts = products.flatMap((p) => attributes(p).filter(([, a]) => a.status === "conflicting").map(([k, a]) => ({ p, k, a })));
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
