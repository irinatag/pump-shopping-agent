import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { classifyProduct, type Classification } from "@/lib/products/classification";
import { getProduct, getSource } from "@/lib/products";
import { isSourceQuote, type Attribute, type Evidence, type NotApplicableReason, type OwnerDecision, type ResearchEvidence, type SourceQuote, type ProductAttributeKey } from "@/lib/products/types";
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

/** A verbatim quote from a manufacturer page or manual. */
export interface QuoteCitation {
  url: string;
  publisher: string;
  accessedOn: string;
  quote: string;
  scope: NonNullable<SourceQuote["scope"]>;
  section: NonNullable<SourceQuote["section"]>;
}

/** A research-package row (paraphrase, owner verification, retailer listing or derivation). Not a page quote. */
export type ResearchCitation = Omit<ResearchEvidence, "kind"> & { kind: "research" };

export type DecisionCitation = Omit<OwnerDecision, "kind"> & { kind: "owner-decision" };

export type FactCitation = QuoteCitation | ResearchCitation | DecisionCitation;

export const isQuoteCitation = (c: FactCitation): c is QuoteCitation => !("kind" in c);

export interface ProductFacts {
  productId: string;
  brand: string;
  model: string;
  classification: Classification;
  verified: { attribute: ProductAttributeKey; value: unknown; citations: FactCitation[] }[];
  inferred: {
    attribute: ProductAttributeKey;
    value: unknown;
    rationale: string;
    citations: FactCitation[];
    /** Present when an owner-approved rule settled a manufacturer conflict; the other values stay listed. */
    ruleResolution?: { basis: string; alternatives: { value: unknown; citations: FactCitation[] }[] };
  }[];
  conflicting: { attribute: ProductAttributeKey; note: string; candidates: { value: unknown; citation: FactCitation }[] }[];
  notApplicable: { attribute: ProductAttributeKey; reason: NotApplicableReason; citations: FactCitation[] }[];
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
  if (e.kind === "research") return { ...e };
  if (e.kind === "owner-decision") return { ...e };
  if (!isSourceQuote(e)) throw new Error("unhandled evidence kind");
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
    notApplicable: [],
    unknown: [],
  };

  for (const attribute of ATTRIBUTE_KEYS) {
    const a = p[attribute] as Attribute<unknown>;
    if (a.status === "verified") {
      facts.verified.push({ attribute, value: a.value, citations: a.evidence.map(cite) });
    } else if (a.status === "inferred") {
      const r = a.ruleResolution;
      facts.inferred.push({
        attribute,
        value: a.value,
        rationale: a.rationale,
        citations: a.evidence.map(cite),
        ...(r && { ruleResolution: { basis: r.basis, alternatives: r.alternatives.map((x) => ({ value: x.value, citations: x.evidence.map(cite) })) } }),
      });
    } else if (a.status === "conflicting") {
      facts.conflicting.push({
        attribute,
        note: a.note,
        candidates: a.candidates.map((c) => ({ value: c.value, citation: cite(c.evidence) })),
      });
    } else if (a.status === "not-applicable") {
      facts.notApplicable.push({ attribute, reason: a.reason, citations: a.evidence.map(cite) });
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
