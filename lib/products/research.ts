import type { Product, ProductAttributeKey, ResearchEvidence } from "@/lib/products/types";

// Research-package overlay: attribute results generated from a research CSV by
// scripts/catalog/import_research.py. Applying it replaces whole attributes, so applying twice
// equals applying once, and removing the overlay restores the hand-written catalog.

export type ResearchChange = "update" | "add" | "confirm" | "rule-resolved" | "owner-decision";

export type ResearchEntry = {
  [K in ProductAttributeKey]: { productId: string; attribute: K; csvLine: number; change: ResearchChange; result: Product[K] };
}[ProductAttributeKey];

/** Kept with the product but outside its attributes: a note never becomes a value. */
export interface MaintainerNote {
  productId: string;
  text: string;
  evidence: ResearchEvidence;
}

export interface ResearchOverlay {
  package: { id: string; baseline: string; researchSha256: string; ratingsSha256: string; catalogExportSha256: string };
  entries: ResearchEntry[];
  maintainerNotes: MaintainerNote[];
}

/** Returns new product records with each overlay entry's attribute replaced. Inputs are not mutated. */
export function applyResearch(base: Product[], overlay: ResearchOverlay): Product[] {
  const ids = new Set(base.map((p) => p.id));
  const seen = new Set<string>();
  const byProduct = new Map<string, ResearchEntry[]>();
  for (const e of overlay.entries) {
    if (!ids.has(e.productId)) throw new Error(`research overlay: unknown product ${e.productId}`);
    const key = `${e.productId}.${e.attribute}`;
    if (seen.has(key)) throw new Error(`research overlay: duplicate entry ${key}`);
    seen.add(key);
    byProduct.set(e.productId, [...(byProduct.get(e.productId) ?? []), e]);
  }
  return base.map((p) => {
    const entries = byProduct.get(p.id);
    if (!entries) return p;
    const next = { ...p } as Record<string, unknown>;
    for (const e of entries) next[e.attribute] = e.result;
    return next as unknown as Product;
  });
}
