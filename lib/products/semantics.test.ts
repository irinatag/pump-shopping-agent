import { describe, expect, it } from "vitest";
import { getProduct, products } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { classifyProduct } from "@/lib/products/classification";
import type { Attribute, Comparator, Evidence, Measure, Product } from "@/lib/products/types";

// Automated checks that stored values follow the attribute definitions in docs/DATA.md.

type Known<T> = Extract<Attribute<T>, { value: T }>;
const known = <T>(a: Attribute<T>): a is Known<T> => a.status === "verified" || a.status === "inferred";
const quotes = (a: Known<unknown>) => a.evidence.map((e) => e.quote);
const clean = (s: string) => s.replace(/[®™]/g, "").replace(/[‘’]/g, "'");

// ---- numbers, units, qualifiers -------------------------------------------------

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
const UNIT: Record<string, string> = {
  mmHg: "\\s?mm\\s?hg",
  dB: "\\s?-?(d[bB]|decibels?)",
  ml: "\\s?m[lL]",
  oz: "\\s?(oz|ounces?)",
  g: "\\s?(g|grams?)\\b",
  kg: "\\s?kg",
  lb: "\\s?(lbs?|pounds?)",
  hours: "\\s?(h|hrs?|hours?)\\b",
  min: "\\s?(min|mins|minutes?)\\b",
  sessions: "\\s?([a-z0-9-]+ ){0,2}se+s+ions?",
};

function numberPattern(n: number): string {
  const s = String(n);
  const alts = [s.replace(".", "\\."), n < 1 ? s.replace(/^0/, "").replace(".", "\\.") : null, Number.isInteger(n) ? `${n}\\.0` : null];
  const word = Object.entries(WORDS).find(([, v]) => v === n)?.[0];
  if (word) alts.push(word);
  return `(?<![\\d.])(${alts.filter(Boolean).join("|")})`;
}

/** Index of the stored amount (with its unit) in the quote, or -1. Minutes may be stated in hours. */
function locate(m: Measure<string>, quote: string): number {
  const q = clean(quote);
  const tries: [number, string][] = [[m.amount, UNIT[m.unit]]];
  if (m.unit === "min") tries.push([m.amount / 60, UNIT.hours]);
  for (const [amount, unit] of tries) {
    const hit = new RegExp(numberPattern(amount) + "\\+?" + unit, "i").exec(q);
    if (hit) return hit.index;
  }
  return -1;
}

const QUALIFIERS: [Exclude<Comparator, "eq">, RegExp][] = [
  ["up-to", /up to|≤|\bmax(imum)?\b|\d\s*[-–]\s*-?\s*$|\d\s+to\s+-?\s*$/i],
  ["lt", /less than|under|<|nearly/i],
  ["at-least", /\bover\b|more than/i],
  ["approximately", /approximately|about|≈|~|average/i],
];

function windowQualifiers(quote: string, at: number): Set<Comparator> {
  const q = clean(quote);
  // A leading "2 - " / "(2) " is a quantity in a box list, not the start of a range.
  const before = /^\(?\d+\)?\s*[-–]\s*$/.test(q.slice(0, at)) ? "" : q.slice(Math.max(0, at - 16), at);
  const after = q.slice(at, at + 12);
  const found = new Set<Comparator>();
  for (const [c, rx] of QUALIFIERS) if (rx.test(before)) found.add(c);
  if (/^\d+(\.\d+)?\s?\+/.test(after)) found.add("at-least");
  return found;
}

const MEASURES = ["batteryLife", "batterySessions", "maxSuction", "noise", "capacity", "weight"] as const;

function measureEntries() {
  return products.flatMap((p) =>
    MEASURES.flatMap((k) => {
      const a = p[k] as Attribute<Measure<string>>;
      if (known(a)) return [{ p, k, m: a.value, ev: a.evidence, inferred: a.status === "inferred" ? a.rationale : null }];
      if (a.status === "conflicting") return a.candidates.map((c) => ({ p, k, m: c.value, ev: [c.evidence], inferred: null }));
      return [];
    }),
  );
}

describe("numeric values", () => {
  const entries = measureEntries();

  it.each(entries.map((e) => [`${e.p.id}.${e.k} ${e.m.amount} ${e.m.unit}`, e] as const))(
    "%s appears in a quote with its unit and a matching qualifier",
    (_label, { m, ev, inferred }) => {
      if (inferred && /convert/i.test(inferred)) return; // documented unit conversion
      const located = ev.map((e) => ({ e, at: locate(m, e.quote) })).filter((x) => x.at >= 0);
      expect(located.length, `amount and unit not found in: ${ev.map((e) => e.quote).join(" | ")}`).toBeGreaterThan(0);

      const windowed = new Set(located.flatMap(({ e, at }) => [...windowQualifiers(e.quote, at)]));
      if (m.comparator === "eq") {
        expect([...windowed], "stored as exact, but the source qualifies the number").toEqual([]);
      } else {
        const anywhere = ev.some((e) => QUALIFIERS.find(([c]) => c === m.comparator)?.[1].test(clean(e.quote)) || /\d\+/.test(e.quote));
        expect(windowed.has(m.comparator) || anywhere, `stored "${m.comparator}" without that qualifier in the source`).toBe(true);
      }
    },
  );
});

// ---- attribute semantics ----------------------------------------------------------

const allMatch = (a: Known<unknown>, rx: RegExp) => quotes(a).some((q) => rx.test(clean(q)));

describe("attribute semantics", () => {
  it("hands-free 'with-accessories' cites the accessory; 'as-sold' cites hands-free or in-bra wording, or is inferred from in-bra collection", () => {
    for (const p of products) {
      const h = p.handsFree;
      if (!known(h)) continue;
      if (h.value === "with-accessories") expect(allMatch(h, /separately|bra|bustier|purchase|cups/i), p.id).toBe(true);
      if (h.value === "as-sold" && h.status === "verified") {
        expect(allMatch(h, /hands[- ]?free|in[- ]?bra|in your bra|inside .*bra|no need to hold/i), p.id).toBe(true);
      }
      if (h.value === "as-sold" && h.status === "inferred") {
        expect(known(p.collection) && p.collection.value.some((c) => c === "in-bra-wearable" || c === "external-unit-with-in-bra-cups"), p.id).toBe(true);
      }
    }
  });

  it("power sources cite operating evidence: mains needs plug/outlet/AC/cord wording unless inferred", () => {
    for (const p of products) {
      const ps = p.powerSources;
      if (!known(ps)) continue;
      if (ps.value.includes("mains") && ps.status === "verified") expect(allMatch(ps, /plug|outlet|\bAC\b|cord|wall|mains/i), p.id).toBe(true);
      if (ps.value.includes("built-in-battery")) expect(allMatch(ps, /batter|rechargeab|mah|charg/i), p.id).toBe(true);
      if (ps.value.includes("none")) {
        expect(ps.value).toEqual(["none"]);
        expect(allMatch(ps, /manual|no (cords or )?batter|no charging|passive|squeez|hand/i), p.id).toBe(true);
      }
    }
  });

  it("battery duration and pumping sessions are kept apart", () => {
    for (const p of products) {
      if (known(p.batteryLife)) expect(allMatch(p.batteryLife, /\d\s?(h|hrs?|hours?|min|mins|minutes?)\b|(two|three|four) hours/i), p.id).toBe(true);
      if (known(p.batterySessions)) expect(allMatch(p.batterySessions, /se+s+ions?/i), p.id).toBe(true);
    }
  });

  it("dishwasher scope and top-rack flags match the source wording", () => {
    for (const p of products) {
      const d = p.dishwasherSafe;
      if (!known(d)) continue;
      expect(allMatch(d, /dishwasher/i), p.id).toBe(true);
      expect(d.value.topRackOnly === true, `${p.id} top rack`).toBe(allMatch(d, /top[- ]rack/i));
      if (d.value.parts === "all") expect(allMatch(d, /\ball\b|\bboth\b|one part/i), p.id).toBe(true);
      if (d.value.parts === "some") expect(allMatch(d, /portions|cups|kit|set parts|excludes|except|shields|collection cup|do not wash|that come into contact/i), p.id).toBe(true);
    }
  });

  it("weight scope is only specific when the source says what was weighed", () => {
    const scopeWords = { motor: /pump|motor|unit/i, "per-cup": /cup/i, "single-wearable-unit": /each|per/i, pair: /pair|both/i, kit: /system|kit|package/i } as const;
    for (const p of products) {
      const w = p.weight;
      if (!known(w) || w.value.scope === "unspecified") continue;
      expect(allMatch(w, scopeWords[w.value.scope]), `${p.id} scope ${w.value.scope}`).toBe(true);
    }
  });

  it("every inferred attribute carries a rationale and evidence", () => {
    for (const p of products) {
      for (const k of ATTRIBUTE_KEYS) {
        const a = p[k] as Attribute<unknown>;
        if (a.status !== "inferred") continue;
        expect(a.rationale.length, `${p.id}.${k}`).toBeGreaterThan(10);
        expect(a.evidence.length, `${p.id}.${k}`).toBeGreaterThan(0);
      }
    }
  });
});

// ---- provenance: model, variant, cross-product --------------------------------------

function evidenceOf(p: Product): { k: string; e: Evidence }[] {
  return ATTRIBUTE_KEYS.flatMap((k) => {
    const a = p[k] as Attribute<unknown>;
    if (known(a)) return a.evidence.map((e) => ({ k, e }));
    if (a.status === "conflicting") return a.candidates.map((c) => ({ k, e: c.evidence }));
    return [];
  });
}

/** Comparative statements that name another model but describe this one. */
const COMPARATIVE_ALLOWED = new Set(["elvie-stride|Unlike Elvie Pump, there is a small Hub which sits outside of the bra."]);

describe("evidence provenance", () => {
  it("flags evidence from another product's page as brand-wide or other-product", () => {
    for (const p of products) {
      for (const { k, e } of evidenceOf(p)) {
        if (e.sourceId !== p.sourceIds[0]) expect(["brand-wide", "other-product"], `${p.id}.${k} cites ${e.sourceId}`).toContain(e.scope);
      }
    }
  });

  it("does not attribute statements naming another catalog model to this model", () => {
    for (const p of products) {
      const own = clean(p.model).toLowerCase();
      const others = products.filter((o) => o.brand === p.brand && o.id !== p.id && o.id !== p.variantOf && o.variantOf !== p.id);
      for (const { k, e } of evidenceOf(p)) {
        if (e.scope && e.scope !== "this-product") continue;
        const q = clean(e.quote).toLowerCase();
        for (const o of others) {
          const name = clean(o.model).replace(/\s*\(.*\)$/, "").toLowerCase();
          if (name.length < 6 || own.includes(name) || !q.includes(name)) continue;
          expect(COMPARATIVE_ALLOWED.has(`${p.id}|${e.quote}`), `${p.id}.${k} quote names ${o.model}: "${e.quote}"`).toBe(true);
        }
      }
    }
  });

  it("keeps variant-specific evidence on the right record", () => {
    for (const variant of products.filter((p) => p.variantOf)) {
      const base = getProduct(variant.variantOf!);
      const marker = clean(variant.model).replace(clean(base.model).replace(/\s*\(.*\)$/, ""), "").trim().toLowerCase(); // e.g. "with battery"
      for (const { k, e } of evidenceOf(base)) expect(clean(e.quote).toLowerCase().includes(marker), `${base.id}.${k} cites variant text`).toBe(false);
      for (const k of ATTRIBUTE_KEYS) {
        if (JSON.stringify(variant[k]) === JSON.stringify(base[k])) continue;
        const ev = evidenceOf(variant).filter((x) => x.k === k);
        expect(ev.some(({ e }) => /batter/i.test(e.quote)), `${variant.id}.${k} differs from base without variant-specific evidence`).toBe(true);
      }
    }
  });
});

// ---- classification -------------------------------------------------------------

describe("derived classification", () => {
  it("classifies every product except those whose configuration is not established", () => {
    const unclassified = products.filter((p) => classifyProduct(p).status !== "derived").map((p) => p.id);
    expect(unclassified.sort()).toEqual(["momcozy-m6-mobile-style"]);
  });

  it("never classifies from a portability feature alone", () => {
    for (const p of products) {
      const c = classifyProduct(p);
      if (c.status === "derived") expect(c.basis).not.toContain("portability");
    }
  });

  it("marks classifications that rest on inferred attributes", () => {
    for (const p of products) {
      const c = classifyProduct(p);
      if (c.status !== "derived") continue;
      const basisInferred = c.basis.some((k) => (p[k] as Attribute<unknown>).status === "inferred");
      expect(c.usesInferred, p.id).toBe(basisInferred);
    }
  });
});
