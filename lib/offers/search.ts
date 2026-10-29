import { getProduct } from "@/lib/products";
import type { FreeOfferSearch, Quote, QuoteProvider, UserPreferences } from "@/lib/offers/types";

/**
 * A quote qualifies as a free pump only when coverage is confirmed, it is in
 * stock, and every charge is a known $0. Unknown (null) charges never qualify.
 */
export function isQualifyingFreeOffer(q: Quote): boolean {
  const { pumpOutOfPocketCents, shippingCents, otherMandatoryCents, totalOutOfPocketCents } = q.charges;
  return (
    q.status === "fully-covered" &&
    q.inStock === true &&
    pumpOutOfPocketCents === 0 &&
    shippingCents === 0 &&
    otherMandatoryCents === 0 &&
    totalOutOfPocketCents === 0
  );
}

const statusRank = { "fully-covered": 0, upgrade: 1, "not-covered": 2, unverified: 3 } as const;
const orInfinity = (n: number | null) => n ?? Number.POSITIVE_INFINITY;
const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Base offer ordering: in stock, coverage status, total member cost, shipping
 * speed, then ids for a stable tie-break. Not the personalized recommendation (Milestone 3).
 */
export function compareQuotes(a: Quote, b: Quote): number {
  return (
    Number(b.inStock === true) - Number(a.inStock === true) ||
    statusRank[a.status] - statusRank[b.status] ||
    orInfinity(a.charges.totalOutOfPocketCents) - orInfinity(b.charges.totalOutOfPocketCents) ||
    orInfinity(a.shippingDays) - orInfinity(b.shippingDays) ||
    byId(a.supplierId, b.supplierId) ||
    byId(a.productId, b.productId)
  );
}

export function rankQuotes(quotes: Quote[]): Quote[] {
  return [...quotes].sort(compareQuotes);
}

function matchesPreferences(q: Quote, preferences: UserPreferences): boolean {
  if (preferences.categories.length === 0) return true;
  const category = getProduct(q.productId).category;
  return category.status === "verified" && preferences.categories.includes(category.value);
}

/** Default free-pump search: only qualifying $0 offers, never a paid fallback. */
export async function findFreeOffers(
  provider: QuoteProvider,
  planId: string,
  preferences: UserPreferences,
): Promise<FreeOfferSearch> {
  const response = await provider.getQuotes({ planId });
  if (response.status === "unknown_plan") return { outcome: "coverage_unverified", reason: "unknown_plan", offers: [] };
  if (response.status === "verification_failed") return { outcome: "coverage_unverified", reason: "verification_failed", offers: [] };

  const offers = rankQuotes(response.quotes).filter((q) => isQualifyingFreeOffer(q) && matchesPreferences(q, preferences));
  return offers.length > 0 ? { outcome: "free_offers_found", offers } : { outcome: "no_free_offers", offers: [] };
}
