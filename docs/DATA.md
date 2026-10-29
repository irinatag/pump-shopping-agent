# PumpPath Data Architecture

PumpPath keeps three kinds of data apart because they have different sources, lifetimes, and verification rules.

| Domain | Code | What it holds | Where values come from |
|---|---|---|---|
| **A. Product catalog** | `lib/products/` | Real pump models and their manufacturer specifications | US manufacturer web pages, quoted verbatim |
| **B. Supplier catalog** | `lib/suppliers/` | Who the suppliers are and which models they publicly list | Real: supplier pages robots.txt allows. Simulated: invented |
| **C. Dynamic insurance offers** | `lib/offers/` | Plan-specific eligibility, availability, upgrade fees, shipping, total out-of-pocket | A `QuoteProvider` only (today: `SimulatedQuoteProvider`) |

Claude reads all three only through `lib/grounding.ts`, which keeps product facts and offer data in separate sections.

## A. Product catalog

**74 records = 73 distinct US-market models + 1 variant**, from 12 brands, built from 73 manufacturer pages read on 2026-10-28.

| Brand | Models |
|---|---|
| Medela (13) | Pump In Style Pro; Pump In Style Pro+ Traditional; Pump In Style Pro+ Hands-free; Sonata; Freestyle Hands-free; Freestyle Mini Hands-free; Pump In Style Hands-free; Swing Maxi Hands-free; Magic InBra; Melody InBra; Motion InBra; Harmony Manual; Symphony PLUS |
| Momcozy (10) | M5 Smart; Air 1; M9 Mobile Flow; M6 Mobile Style; S9 Pro; Wellness 1 (W1); S12 Pro Quick; V1 Pro; V2 Pro; V3 |
| Spectra (8) | S1 Plus; S2 Plus; 9 Plus; Synergy Gold; Synergy Gold Portable; Handy Plus Manual; Premier Wearable; S3 Pro Multi-user |
| Lansinoh (8) | DiscreetDuo Flow; Thrive 2-in-1; Manual; NaturalWave; Signature Comfort; Silicone; Smartpump 3.0; Wearable |
| Motif (7) | Duo; Manual Silicone; Aura Glow; Luna; Luna with Battery *(variant of Luna)*; Roam; Twist |
| Ameda (6) | Mya Joy; Mya Joy PLUS; Pearl; Platinum Multi-User; One-Hand Manual; GLO |
| Willow (5) | Willow 360; Willow Sync; Wave Manual; Silicone Wearable; Willow Go |
| Evenflo (5) | Advanced Double Electric; Deluxe Advanced Double Electric; Advanced Single Electric; Advanced Manual; Pocket Portable Double Electric |
| Zomee (4) | Mother's Nature H1; Z2; Fit; Mother's Nature W1 |
| Elvie (3) | Elvie Pump; Elvie Stride; Elvie Curve |
| BabyBuddha (3) | BabyBuddha 3.0; Wearable; Manual |
| eufy (2) | Wearable S2 Pro; Wearable S2 |

Categories: wearable 22, traditional electric 15, hands-free electric (separate motor + in-bra cups) 11, manual 11, portable electric 10, multi-user 4, unknown 1 (Momcozy M6 — see below).

### Attribute model

Every product has the same 15 attributes. Each is exactly one of:

- `verified` — a value plus one or more `{ sourceId, quote }` evidence items. Each quote is **verbatim text from the manufacturer page**.
- `conflicting` — two or more sourced candidate values and a note. Used when a manufacturer contradicts itself; we never pick one.
- `unknown` — no value, optional note. The default whenever the source is silent or ambiguous.

Coverage (verified / conflicting / unknown, of 74):

| Attribute | V | C | U | | Attribute | V | C | U |
|---|---|---|---|---|---|---|---|---|
| category | 73 | 0 | 1 | | handsFree | 35 | 0 | 39 |
| pumping (single/double) | 25 | 0 | 49 | | closedSystem | 31 | 0 | 43 |
| power | 59 | 0 | 15 | | dishwasherSafe | 23 | 0 | 51 |
| batteryLife | 17 | 2 | 55 | | cleaning | 24 | 1 | 49 |
| weight | 23 | 0 | 51 | | capacity | 36 | 3 | 35 |
| maxSuction | 38 | 1 | 35 | | includedItems | 53 | 0 | 21 |
| suctionLevels | 45 | 0 | 29 | | features | 26 | 0 | 48 |
| noise | 21 | 1 | 52 | | | | | |

Overall 529 of 1,110 attribute slots are verified (48%). Unknowns are expected: many manufacturers do not publish noise, weight, or battery runtime in minutes (several state "sessions" instead, which we do not convert).

### Recording rules

- **Manufacturer US pages only.** Supplier and retailer pages are never used for specifications. Customer reviews on manufacturer pages are never evidence.
- **Verbatim quotes.** Values are recorded as the source states them (units included; e.g. "less than 2 pounds" is `{ amount: 2, unit: "lb", comparator: "lt" }`). The one arithmetic normalization is Ameda Pearl's "3lbs. 6oz" stored as 54 oz.
- **Negative vacuum figures** (e.g. "-300 mmHg") are stored as magnitudes.
- **Ambiguous context → unknown.** Values from multi-product comparison tables (eufy) or next to related-product carousels (Spectra SG weight) are not attributed.
- **`power`** lists the power options the page evidences; it is not a claim that no other option exists.
- **Category** is PumpPath's classification, justified by a quote. If the page doesn't support a classification (Momcozy M6: "hands-free" but not whether it is in-bra or a separate motor), category is unknown and the offer engine will not quote it.
- **Variants vs bundles.** Separately sold configurations with different specs are separate records; `variantOf` is set only when the manufacturer presents one as a version of the other (Motif Luna with Battery). Bundles and accessory adapters are excluded (e.g. Zomee Manual is a "Manual Hand Pump Adapter", not a complete pump). Evenflo Advanced and Deluxe Advanced share identical copy and are kept as separate records with no variant claim.
- **Currently marketed only.** Philips Avent SCF393/52, SCF394/52 and SCF394/62 are marked "Discontinued" on Philips' US site and are excluded, though Aeroflow still lists one.

### Recorded conflicts

| Product | Attribute | Candidates |
|---|---|---|
| Motif Roam | batteryLife | up to 90 min vs up to 120 min |
| Motif Luna with Battery | batteryLife | over 2 hours vs up to 4+ hours |
| Momcozy M6 | maxSuction | -285 to -300 mmHg vs 295 mmHg |
| Momcozy S9 Pro | noise | <45 dB vs 50 dB |
| Lansinoh Wearable | cleaning | 3 parts vs 4 parts |
| Lansinoh NaturalWave | capacity | "5 oz/60 ml" (units disagree) |
| Zomee Fit | capacity | 6 oz vs 150 ml |
| BabyBuddha Wearable | capacity | more than 6 oz vs 8 oz |

### Verification

- `npm test` enforces structure offline: ≥50 models, unique ids and brand+model names, every verified attribute has a non-empty quote, every cited source is declared and used, conflicts have ≥2 differing candidates, unknowns carry no value, and **product records contain no price/shipping/stock/coverage keys**.
- `SOURCE_SNAPSHOTS=<dir> npx vitest run lib/products/verify-sources.test.ts` checks every quote against saved page text (whitespace, zero-width characters and typographic quotes normalized; wording must match). It also checks supplier listing names and sitemap URLs. On 2026-10-28 all 1,118 checks passed. Snapshots are not committed (third-party content); re-fetch to re-verify and update `accessedOn`.

## B. Supplier catalog

- **Real suppliers** (`lib/suppliers/real.ts`)
  - **Aeroflow Breastpumps** — listings collected: model name and URL only, from `/breast-pumps/` (page 1; pagination uses query strings, which robots.txt disallows) and `sitemap.xml`. 53 observations: 18 with names verbatim from the listing page, 35 from sitemap URLs. **No prices are stored**: displayed prices are retail, carry a "partially covered… co-pay or deductible" disclaimer, and say nothing about any specific plan.
  - **Yummy Mummy** — not collected. Its terms of service prohibit copying site content without prior written consent, and robots.txt disallows the insurer/region listing pages. Using its catalog requires written permission or a partnership.
- **A listing is not evidence of coverage.** Listing observations are never read by the offer engine.
- **Simulated suppliers** (`lib/suppliers/simulated.ts`) — 12 fictional suppliers with `provenance: "simulated"`. Names must not resemble real suppliers or pump brands (the former "Willow Lane Medical" was renamed "Wren Lane Medical").

## C. Dynamic insurance offers

### Quote provider

```ts
interface QuoteProvider {
  readonly id: string;
  readonly provenance: "simulated" | "supplier-api";
  getQuotes(req: { planId: string; productIds?: string[] }): Promise<
    | { status: "ok"; quotes: Quote[] }
    | { status: "unknown_plan" }
    | { status: "verification_failed"; detail: string }
  >;
}
```

Every `Quote` carries `provenance` — `{ kind: "simulated", label }` or `{ kind: "supplier-api", supplierId, retrievedAt, reference }` — and `charges` (`pumpOutOfPocketCents`, `shippingCents`, `otherMandatoryCents`, `totalOutOfPocketCents`), each **`null` when the provider did not supply it**. `findFreeOffers`, ranking, and grounding take any provider, so a real integration can replace the simulated one without changing callers.

### Free-pump rule

`isQualifyingFreeOffer` accepts a quote only if status is `fully-covered`, `inStock === true`, and pump, shipping, other mandatory, and total charges are all known and exactly 0. Unknown charges never qualify. `findFreeOffers` returns `free_offers_found`, `no_free_offers` (empty, no paid fallback), or `coverage_unverified` (`unknown_plan` / `verification_failed`). A quote with an unverified product category has status `unverified` — distinct from `not-covered`.

### Simulated shipping policy

For the hackathon demo, **every simulated insurance pump offer ships free**: `SIMULATED_SHIPPING_CENTS = 0`, applied to every quote from `SimulatedQuoteProvider` and enforced by tests. This is a demo business rule only:

- It is not a claim about any real supplier, and not a legal guarantee (e.g. under the Affordable Care Act).
- Free shipping ≠ free pump. Scenario B's $75 offer ships free but costs $75.
- Real quotes must take shipping from authoritative supplier data; a real quote with unknown shipping is not a confirmed free offer.

### Simulated data

`lib/offers/simulated/data.ts`: 4 fictional plans (covered categories, allowance, upgrade policy), 47 offerings across 9 real catalog products, and one coverage override. Simulated list prices are invented and are not the products' real retail prices.

| Scenario | Plan | Guarantee |
|---|---|---|
| A — Multiple free options | Evergreen PPO, traditional electric | 8 qualifying $0 offers from 6 suppliers |
| B — Same pump, different price | Evergreen PPO, Medela Pump In Style Pro | $0 at Bloom Maternity (5-day), $75 at MamaMend (4-day), both free shipping; $0 ranks first; $75 never in free search |
| H — Order timeout | Summit EPO, Spectra S2 Plus at Coastal Care | Qualifying $0 selection; timeout → `pending-reconciliation`; idempotency key required (behavior in Milestone 4) |

## Grounding for Claude

`buildGroundingContext({ productIds, quotes })` returns rules, product facts (verified values with source URL, publisher, date and quote; conflicting candidates; unknown attributes), and offer facts copied verbatim from provider quotes with their provenance. Claude must not state unverified specs or compute eligibility, prices, stock, or delivery.

## Future real supplier integrations

Verified plan-specific pricing cannot be obtained from public pages: suppliers show plan cost only after collecting insurance, personal, and prescriber details, which PumpPath does not collect. A real `QuoteProvider` needs one of:

- A supplier partnership or API that returns eligibility, stock, and itemized member charges (including shipping) for a plan, with terms permitting display.
- An eligibility-verification integration (e.g. a clearinghouse) plus HIPAA-compliant handling of member data, consent, and a BAA where required.

Such a provider must return `provenance.kind = "supplier-api"`, leave charges `null` when unknown, and never default shipping to $0.
