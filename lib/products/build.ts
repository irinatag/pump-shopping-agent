import type { Attribute, Evidence, Product, ProductAttributeKey } from "@/lib/products/types";

// Small helpers so catalog files read as "value + where it came from".

export const ATTRIBUTE_KEYS: ProductAttributeKey[] = [
  "category",
  "pumping",
  "power",
  "batteryLife",
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

/** Verified value supported by one or more verbatim quotes from `sourceId`. */
export function v<T>(value: T, sourceId: string, ...quotes: string[]): Attribute<T> {
  if (quotes.length === 0) throw new Error("verified attribute needs at least one quote");
  return { status: "verified", value, evidence: quotes.map((quote): Evidence => ({ sourceId, quote })) };
}

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

type ProductInput = Pick<Product, "id" | "brand" | "model" | "sourceIds" | "category"> &
  Partial<Omit<Product, "id" | "brand" | "model" | "market" | "sourceIds" | "category">>;

/** Fills every attribute not supplied with an explicit "unknown". */
export function product(input: ProductInput): Product {
  const filled = { market: "US" as const, ...input } as Product;
  for (const key of ATTRIBUTE_KEYS) {
    if (!(key in filled)) (filled as unknown as Record<string, Attribute<unknown>>)[key] = unknown();
  }
  return filled;
}
