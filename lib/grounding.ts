import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { getProduct, getSource } from "@/lib/products";
import type { Attribute, ProductAttributeKey } from "@/lib/products/types";
import { getSupplier } from "@/lib/suppliers";
import type { Quote } from "@/lib/offers/types";

// Builds the only context Claude may use to discuss pumps and offers.
// Product facts and offer data are kept in separate sections with separate provenance.

export const GROUNDING_RULES = [
  "Use only the facts in this context. If an attribute is listed under unknown or conflicting, say it is not verified.",
  "Cite product facts by source URL. Never state a specification that is not listed as a verified fact.",
  "Never calculate or infer eligibility, prices, stock, shipping, or delivery dates; repeat offer values exactly as given.",
  "Every offer carries a provenance label. Simulated offers must be described as simulated, never as real insurance coverage.",
] as const;

export interface FactCitation {
  url: string;
  publisher: string;
  accessedOn: string;
  quote: string;
}

export interface ProductFacts {
  productId: string;
  brand: string;
  model: string;
  verified: { attribute: ProductAttributeKey; value: unknown; citations: FactCitation[] }[];
  conflicting: { attribute: ProductAttributeKey; note: string; candidates: { value: unknown; citation: FactCitation }[] }[];
  unknown: { attribute: ProductAttributeKey; note?: string }[];
}

export interface OfferFacts {
  provenance: Quote["provenance"];
  productId: string;
  supplierName: string;
  planId: string;
  status: Quote["status"];
  reasons: Quote["reasons"];
  charges: Quote["charges"];
  inStock: Quote["inStock"];
  shippingDays: Quote["shippingDays"];
}

export interface GroundingContext {
  rules: readonly string[];
  products: ProductFacts[];
  offers: OfferFacts[];
}

function cite(sourceId: string, quote: string): FactCitation {
  const s = getSource(sourceId);
  return { url: s.url, publisher: s.publisher, accessedOn: s.accessedOn, quote };
}

export function getProductFacts(productId: string): ProductFacts {
  const p = getProduct(productId);
  const facts: ProductFacts = { productId: p.id, brand: p.brand, model: p.model, verified: [], conflicting: [], unknown: [] };

  for (const attribute of ATTRIBUTE_KEYS) {
    const a = p[attribute] as Attribute<unknown>;
    if (a.status === "verified") {
      facts.verified.push({ attribute, value: a.value, citations: a.evidence.map((e) => cite(e.sourceId, e.quote)) });
    } else if (a.status === "conflicting") {
      facts.conflicting.push({
        attribute,
        note: a.note,
        candidates: a.candidates.map((c) => ({ value: c.value, citation: cite(c.evidence.sourceId, c.evidence.quote) })),
      });
    } else {
      facts.unknown.push(a.note ? { attribute, note: a.note } : { attribute });
    }
  }
  return facts;
}

/** Offer values are copied verbatim from provider quotes; nothing is derived here. */
export function getOfferFacts(q: Quote): OfferFacts {
  return {
    provenance: q.provenance,
    productId: q.productId,
    supplierName: getSupplier(q.supplierId).name,
    planId: q.planId,
    status: q.status,
    reasons: q.reasons,
    charges: q.charges,
    inStock: q.inStock,
    shippingDays: q.shippingDays,
  };
}

export function buildGroundingContext(input: { productIds: string[]; quotes?: Quote[] }): GroundingContext {
  return {
    rules: GROUNDING_RULES,
    products: input.productIds.map(getProductFacts),
    offers: (input.quotes ?? []).map(getOfferFacts),
  };
}
