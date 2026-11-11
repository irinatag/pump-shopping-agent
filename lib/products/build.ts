import type { Attribute, Evidence, Product, ProductAttributeKey } from "@/lib/products/types";

// Small helpers so catalog files read as "value + where it came from".

export const ATTRIBUTE_KEYS: ProductAttributeKey[] = [
  "mechanism",
  "collection",
  "multiUser",
  "pumping",
  "powerSources",
  "batteryLife",
  "batterySessions",
  "portability",
  "weight",
  "maxSuction",
  "suctionLevels",
  "noise",
  "handsFree",
  "closedSystem",
  "dishwasherSafe",
  "cleaning",
  "capacity",
  "includedItems",
  "features",
];

type Quote = string | Evidence;
const toEvidence = (sourceId: string, q: Quote): Evidence => (typeof q === "string" ? { sourceId, quote: q } : q);

/** Verified value supported by one or more verbatim quotes from `sourceId` (or explicit Evidence objects). */
export function v<T>(value: T, sourceId: string, ...quotes: Quote[]): Attribute<T> {
  if (quotes.length === 0) throw new Error("verified attribute needs at least one quote");
  return { status: "verified", value, evidence: quotes.map((q) => toEvidence(sourceId, q)) };
}

/** Value that follows from the quotes by `rationale`; never presented as a direct manufacturer statement. */
export function inferred<T>(value: T, rationale: string, sourceId: string, ...quotes: Quote[]): Attribute<T> {
  if (quotes.length === 0) throw new Error("inferred attribute needs at least one quote");
  return { status: "inferred", value, rationale, evidence: quotes.map((q) => toEvidence(sourceId, q)) };
}

/** Quote from the model's own page title or metadata rather than body copy. */
export const titleQuote = (sourceId: string, quote: string): Evidence => ({ sourceId, quote, section: "page-title" });
export const metaQuote = (sourceId: string, quote: string): Evidence => ({ sourceId, quote, section: "page-metadata" });
/** Manufacturer statement covering all of its pumps, made on another page. */
export const brandWide = (sourceId: string, quote: string): Evidence => ({ sourceId, quote, scope: "brand-wide" });
/** Statement about this model made on a different product's page. */
export const otherProduct = (sourceId: string, quote: string): Evidence => ({ sourceId, quote, scope: "other-product" });

/** List whose items are themselves verbatim text from the source. */
export function list(sourceId: string, items: string[]): Attribute<string[]> {
  return { status: "verified", value: items, evidence: items.map((quote) => ({ sourceId, quote })) };
}

export function conflict<T>(note: string, ...candidates: [T, string, string][]): Attribute<T> {
  return {
    status: "conflicting",
    note,
    candidates: candidates.map(([value, sourceId, quote]) => ({ value, evidence: { sourceId, quote } })),
  };
}

export const unknown = (note?: string): Attribute<never> => (note ? { status: "unknown", note } : { status: "unknown" });

type ProductInput = Pick<Product, "id" | "brand" | "model" | "sourceIds" | "collection"> &
  Partial<Omit<Product, "id" | "brand" | "model" | "market" | "sourceIds" | "collection">>;

const ELECTRIC_SOURCES = ["mains", "built-in-battery", "aa-batteries", "battery-pack"];

/**
 * Fills every attribute not supplied with an explicit "unknown". If `mechanism` is not
 * given but power sources are, mechanism is inferred from them (and marked inferred).
 */
export function product(input: ProductInput): Product {
  const filled = { market: "US" as const, ...input } as Product;
  if (!input.mechanism) {
    const ps = input.powerSources;
    if (ps && (ps.status === "verified" || ps.status === "inferred")) {
      const electric = ps.value.some((s) => ELECTRIC_SOURCES.includes(s));
      const manual = ps.value.length === 1 && ps.value[0] === "none";
      if (electric || manual) {
        filled.mechanism = {
          status: "inferred",
          value: electric ? "electric" : "manual",
          rationale: electric ? "Has an electric power source." : "Needs no power source.",
          evidence: ps.evidence,
        };
      }
    }
  }
  for (const key of ATTRIBUTE_KEYS) {
    if (!(key in filled)) (filled as unknown as Record<string, Attribute<unknown>>)[key] = unknown();
  }
  return filled;
}
