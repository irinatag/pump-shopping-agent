import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { classifyProduct, type Classification } from "@/lib/products/classification";
import { getProduct, getSource } from "@/lib/products";
import type { Attribute, Evidence, ProductAttributeKey } from "@/lib/products/types";
import { getSupplier } from "@/lib/suppliers";
import type { Quote } from "@/lib/offers/types";

// Builds the only context Claude may use to discuss pumps and offers.
// Product facts and offer data are kept in separate sections with separate provenance.

export const GROUNDING_RULES = [
  "Use only the facts in this context. If an attribute is listed under unknown or conflicting, say it is not verified.",
  "Present verified facts as manufacturer statements and cite their source URL.",
  "Present inferred facts as PumpPath's interpretation, with the rationale given; never as a manufacturer statement.",
  "The pump category is a PumpPath classification derived from listed attributes, not a manufacturer claim.",
  "When a citation's scope is brand-wide or other-product, say the claim comes from a brand-wide or another product's page.",
  "Never calculate or infer eligibility, prices, stock, shipping, or delivery dates; repeat offer values exactly as given.",
  "Every offer carries a provenance label. Simulated offers must be described as simulated, never as real insurance coverage.",
] as const;

export interface FactCitation {
  url: string;
  publisher: string;
  accessedOn: string;
  quote: string;
  scope: NonNullable<Evidence["scope"]>;
  section: NonNullable<Evidence["section"]>;
}

export interface ProductFacts {
  productId: string;
  brand: string;
  model: string;
  classification: Classification;
  verified: { attribute: ProductAttributeKey; value: unknown; citations: FactCitation[] }[];
  inferred: { attribute: ProductAttributeKey; value: unknown; rationale: string; citations: FactCitation[] }[];
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

function cite(e: Evidence): FactCitation {
  const s = getSource(e.sourceId);
  return {
    url: s.url,
    publisher: s.publisher,
    accessedOn: s.accessedOn,
    quote: e.quote,
    scope: e.scope ?? "this-product",
    section: e.section ?? "product-content",
  };
}

export function getProductFacts(productId: string): ProductFacts {
  const p = getProduct(productId);
  const facts: ProductFacts = {
    productId: p.id,
    brand: p.brand,
    model: p.model,
    classification: classifyProduct(p),
    verified: [],
    inferred: [],
    conflicting: [],
    unknown: [],
  };

  for (const attribute of ATTRIBUTE_KEYS) {
    const a = p[attribute] as Attribute<unknown>;
    if (a.status === "verified") {
      facts.verified.push({ attribute, value: a.value, citations: a.evidence.map(cite) });
    } else if (a.status === "inferred") {
      facts.inferred.push({ attribute, value: a.value, rationale: a.rationale, citations: a.evidence.map(cite) });
    } else if (a.status === "conflicting") {
      facts.conflicting.push({
        attribute,
        note: a.note,
        candidates: a.candidates.map((c) => ({ value: c.value, citation: cite(c.evidence) })),
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
