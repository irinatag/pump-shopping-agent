// Domain C — dynamic insurance offers. Every value here comes from a QuoteProvider,
// never from the product catalog and never from Claude.
import type { PumpCategory } from "@/lib/products/types";

export const SIMULATED_LABEL = "Simulated demo data — not real insurance coverage, pricing, or inventory.";

export type QuoteProvenance =
  | { kind: "simulated"; providerId: string; label: typeof SIMULATED_LABEL }
  /** Reserved for future authorized supplier integrations. */
  | { kind: "supplier-api"; providerId: string; supplierId: string; retrievedAt: string; reference: string };

export type CoverageStatus = "fully-covered" | "upgrade" | "not-covered" | "unverified";

export type IneligibilityReason =
  | "out-of-network"
  | "category-not-covered"
  | "upgrade-not-allowed"
  /** The product's category is not verified in the catalog, so coverage cannot be decided. */
  | "category-unverified";

/** All amounts are integer cents; null means the provider did not supply the value. */
export interface Charges {
  pumpOutOfPocketCents: number | null;
  shippingCents: number | null;
  otherMandatoryCents: number | null;
  totalOutOfPocketCents: number | null;
}

export interface Quote {
  provenance: QuoteProvenance;
  planId: string;
  supplierId: string;
  productId: string;
  status: CoverageStatus;
  reasons: IneligibilityReason[];
  listPriceCents: number | null;
  insurancePaysCents: number | null;
  charges: Charges;
  inStock: boolean | null;
  shippingDays: number | null;
}

export interface QuoteRequest {
  planId: string;
  /** Limit to these catalog products; omit for every product the provider can quote. */
  productIds?: string[];
}

export type QuoteResponse =
  | { status: "ok"; quotes: Quote[] }
  | { status: "unknown_plan" }
  | { status: "verification_failed"; detail: string };

/** Source of plan-specific eligibility, availability, and charges. */
export interface QuoteProvider {
  readonly id: string;
  readonly provenance: QuoteProvenance["kind"];
  getQuotes(request: QuoteRequest): Promise<QuoteResponse>;
}

export interface UserPreferences {
  /** Empty means any category. */
  categories: PumpCategory[];
}

export type CoverageUnverifiedReason = "unknown_plan" | "verification_failed";

/** `offers` only ever holds qualifying $0 quotes; paid upgrades are never recommended here. */
export type FreeOfferSearch =
  | { outcome: "free_offers_found"; offers: Quote[] }
  | { outcome: "no_free_offers"; offers: [] }
  | { outcome: "coverage_unverified"; reason: CoverageUnverifiedReason; offers: [] };
