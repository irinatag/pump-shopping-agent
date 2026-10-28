import { getPlan, getPump, plans, suppliers } from "@/lib/catalog";
import { checkEligibility } from "@/lib/eligibility";
import { coveredMemberCostCents } from "@/lib/pricing";
import type { FreeOfferSearch, InsurancePlan, Pump, Quote, Supplier, UserPreferences } from "@/lib/types";

export function quoteOffer(plan: InsurancePlan, supplier: Supplier, pump: Pump): Quote {
  const offering = supplier.offerings.find((o) => o.pumpId === pump.id);
  if (!offering) throw new Error(`${supplier.id} does not carry ${pump.id}`);

  const { status, reasons } = checkEligibility(plan, supplier, pump);
  const listPriceCents = pump.retailPriceCents;
  const outOfPocketCents =
    status === "not-covered" ? listPriceCents : coveredMemberCostCents(plan, supplier, pump);

  return {
    planId: plan.id,
    supplierId: supplier.id,
    pumpId: pump.id,
    status,
    reasons,
    listPriceCents,
    insurancePaysCents: Math.max(0, listPriceCents - outOfPocketCents),
    outOfPocketCents,
    inStock: offering.inStock,
    shippingDays: supplier.shippingDays,
  };
}

/** Every supplier offering quoted against one plan, in catalog order. */
export function quotesForPlan(planId: string): Quote[] {
  const plan = getPlan(planId);
  return suppliers.flatMap((supplier) =>
    supplier.offerings.map((offering) => quoteOffer(plan, supplier, getPump(offering.pumpId))),
  );
}

const statusRank = { "fully-covered": 0, upgrade: 1, "not-covered": 2 } as const;

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Base cost ordering: in stock, then coverage status, then member cost, then
 * shipping speed, with ids as a stable tie-break. Personalized ranking is Milestone 3.
 */
export function compareQuotes(a: Quote, b: Quote): number {
  return (
    Number(b.inStock) - Number(a.inStock) ||
    statusRank[a.status] - statusRank[b.status] ||
    a.outOfPocketCents - b.outOfPocketCents ||
    a.shippingDays - b.shippingDays ||
    byId(a.supplierId, b.supplierId) ||
    byId(a.pumpId, b.pumpId)
  );
}

export function rankQuotes(quotes: Quote[]): Quote[] {
  return [...quotes].sort(compareQuotes);
}

export interface FreeOfferSearchOptions {
  /** Simulates the coverage check being unavailable. */
  simulateVerificationFailure?: boolean;
}

/**
 * Default search: only eligible, in-stock $0 offers. Paid quotes stay
 * available via quotesForPlan/quoteOffer for price comparison but are never
 * returned here.
 */
export function findFreeOffers(
  planId: string,
  preferences: UserPreferences,
  options: FreeOfferSearchOptions = {},
): FreeOfferSearch {
  if (!plans.some((p) => p.id === planId)) {
    return { outcome: "coverage_unverified", reason: "unknown_plan", offers: [] };
  }
  if (options.simulateVerificationFailure) {
    return { outcome: "coverage_unverified", reason: "verification_failed", offers: [] };
  }

  const offers = rankQuotes(quotesForPlan(planId)).filter(
    (q) =>
      q.status === "fully-covered" &&
      q.outOfPocketCents === 0 &&
      q.inStock &&
      (preferences.pumpTypes.length === 0 || preferences.pumpTypes.includes(getPump(q.pumpId).type)),
  );

  if (offers.length > 0) return { outcome: "free_offers_found", offers };
  return { outcome: "no_free_offers", offers: [] };
}
