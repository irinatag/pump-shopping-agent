import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { classifyProduct, type Classification } from "@/lib/products/classification";
import { getProduct, getSource } from "@/lib/products";
import { factLabel, type FactLabel } from "@/lib/products/labels";
import { isSourceQuote, type Attribute, type Evidence, type NotApplicableReason, type OwnerDecision, type ResearchEvidence, type SourceQuote, type ProductAttributeKey } from "@/lib/products/types";
import { getSupplier } from "@/lib/suppliers";
import type { Quote } from "@/lib/offers/types";
import { consumerRatings20261112 } from "@/lib/ratings/consumer-ratings-2026-11-12";
import type { ConsumerRating } from "@/lib/ratings/types";

// Builds the only context Claude may use to discuss pumps and offers.
// Product facts and offer data are kept in separate sections with separate provenance.

export const GROUNDING_RULES = [
  "Use only the facts in this context. If an attribute is listed under unknown or conflicting, say it is not verified.",
  "Every product fact carries a label; describe the fact the way its label says.",
  "Present manufacturer-verified facts as manufacturer statements and cite their source URL.",
  "Present owner-verified facts as verified by PumpPath; never call them manufacturer statements or manufacturer-confirmed.",
  "Present inferred facts as PumpPath's interpretation, with the rationale given; never as a manufacturer statement.",
  "For a rule-resolved fact, say the manufacturer's own sources disagree, give the kept value, and mention the other values listed with it.",
  "For a retailer-listed fact, say it comes from a retailer listing and is not confirmed by the manufacturer.",
  "If an attribute is listed under not applicable, say it does not apply, with the reason given; never call it unknown or missing.",
  "Research citations are researcher summaries, not page quotes. Quote only a citation's quote or keyQuote word for word, and say a keyQuote was captured during research; never present a summary as a quote. Mention stated limitations when they affect the answer.",
  "Consumer ratings are opinions counted from manufacturer-hosted reviews, with low confidence. Keep them apart from product facts, give their confidence and caveats, and never use them to state or contradict a product fact.",
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
  verified: { attribute: ProductAttributeKey; label: FactLabel; value: unknown; citations: FactCitation[] }[];
  inferred: {
    attribute: ProductAttributeKey;
    label: FactLabel;
    value: unknown;
    rationale: string;
    citations: FactCitation[];
    /** Present when an owner-approved rule settled a manufacturer conflict; the other values stay listed. */
    ruleResolution?: { basis: string; alternatives: { value: unknown; citations: FactCitation[] }[] };
  }[];
  conflicting: { attribute: ProductAttributeKey; label: FactLabel; note: string; candidates: { value: unknown; citation: FactCitation }[] }[];
  notApplicable: { attribute: ProductAttributeKey; label: FactLabel; reason: NotApplicableReason; citations: FactCitation[] }[];
  unknown: { attribute: ProductAttributeKey; label: FactLabel; note?: string }[];
}

/** Consumer-rating columns passed to Claude. The dishwasher column is left out: the catalog's dishwasherSafe is canonical. */
const RATING_FIELDS = [
  "productId",
  "noiseRating",
  "noiseConfidence",
  "noiseReviewStatus",
  "noiseRatingSource",
  "noiseQuietMentions",
  "noiseModerateMentions",
  "noiseLoudMentions",
  "cleaningRating",
  "cleaningConfidence",
  "cleaningReviewStatus",
  "cleaningRatingSource",
  "cleaningEasyMentions",
  "cleaningHardMentions",
  "reviewSetCaveats",
  "evidenceOrigin",
] as const satisfies readonly (keyof ConsumerRating)[];

/** Review-based opinions for one product (research package rule R5), kept apart from product facts. */
export type ConsumerRatingFacts = Pick<ConsumerRating, (typeof RATING_FIELDS)[number]> & { package: string };

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
  consumerRatings: ConsumerRatingFacts[];
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
    const label = factLabel(a);
    if (a.status === "verified") {
      facts.verified.push({ attribute, label, value: a.value, citations: a.evidence.map(cite) });
    } else if (a.status === "inferred") {
      const r = a.ruleResolution;
      facts.inferred.push({
        attribute,
        label,
        value: a.value,
        rationale: a.rationale,
        citations: a.evidence.map(cite),
        ...(r && { ruleResolution: { basis: r.basis, alternatives: r.alternatives.map((x) => ({ value: x.value, citations: x.evidence.map(cite) })) } }),
      });
    } else if (a.status === "conflicting") {
      facts.conflicting.push({
        attribute,
        label,
        note: a.note,
        candidates: a.candidates.map((c) => ({ value: c.value, citation: cite(c.evidence) })),
      });
    } else if (a.status === "not-applicable") {
      facts.notApplicable.push({ attribute, label, reason: a.reason, citations: a.evidence.map(cite) });
    } else {
      facts.unknown.push(a.note ? { attribute, label, note: a.note } : { attribute, label });
    }
  }
  return facts;
}

/** Consumer ratings for a product, or null when the package has none for it. */
export function getConsumerRatingFacts(productId: string): ConsumerRatingFacts | null {
  const r = consumerRatings20261112.ratings.find((x) => x.productId === productId);
  if (!r) return null;
  const picked = Object.fromEntries(RATING_FIELDS.filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
  return { package: consumerRatings20261112.package.id, ...picked } as ConsumerRatingFacts;
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
    consumerRatings: input.productIds.map(getConsumerRatingFacts).filter((r): r is ConsumerRatingFacts => r !== null),
    offers: (input.quotes ?? []).map(getOfferFacts),
  };
}
