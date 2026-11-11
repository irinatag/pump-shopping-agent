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

### Attribute statuses

Every product has the same 19 attributes. Each is exactly one of:

| Status | Meaning | Shown to users / Claude as |
|---|---|---|
| `verified` | One or more verbatim quotes **state** the value. | Manufacturer statement, with source |
| `inferred` | The value **follows** from quoted evidence by a stated `rationale`, but the source does not say it outright (e.g. "milk barrier" → closed system; included AC adapter on a pump with no battery → mains power; 3 lb 6 oz → 54 oz). | PumpPath interpretation, with rationale |
| `conflicting` | Two or more sourced candidate values and a note. Never resolved by picking one. | Not verified; both candidates shown |
| `unknown` | No value. A note explains why when the page has a related signal. | Not verified |

### Evidence provenance

Each evidence item is `{ sourceId, quote, scope?, section? }`:

- `scope` — `this-product` (default; the model's own page describes it), `brand-wide` (a manufacturer statement covering all its pumps, e.g. Zomee's "All Zomee breast pumps … have a fully enclosed, anti-backflow system" on the Z2 page), or `other-product` (a statement about this model on another model's page, e.g. "tube-free" for Elvie Pump on the Elvie Stride page). Evidence from any page other than the product's own must carry `brand-wide` or `other-product`. A source of kind `manufacturer-manual` listed in a product's `sourceIds` is that model's own instructions for use (linked from its product page) and counts as its own document.
- `section` — `product-content` (default), `page-title`, or `page-metadata` (the model's own `<title>` or meta description, e.g. Symphony PLUS "hospital-grade, multi-user").

### Classification model

Category is never stored. It is **derived** by `classifyProduct()` (`lib/products/classification.ts`) from three evidence-backed attributes, and reports its basis and whether any basis attribute is inferred:

| Attribute | Values |
|---|---|
| `mechanism` | `electric` · `manual`. If not given explicitly, inferred from `powerSources` (any electric source → electric; `none` → manual). |
| `collection` (list — every configuration in the box) | `in-bra-wearable` — self-contained unit worn in the bra, no external unit · `external-unit-with-in-bra-cups` — in-bra cups driven by an external motor or handle through tubing · `flanges-and-bottles` — flanges with bottles/containers below · `one-piece-silicone` — single-piece passive silicone collector |
| `multiUser` | `true` only when the manufacturer says multi-user / rental; `false` when it says single-user |

Rules, in order:

1. `multiUser = true` → **multi-user**
2. `mechanism = manual` → **manual**
3. electric + `in-bra-wearable` → **wearable**
4. electric + `external-unit-with-in-bra-cups` → **hands-free-electric**
5. electric + `flanges-and-bottles` → **flange-bottle-electric**
6. otherwise **unclassified** — the offer engine returns `unverified` quotes for it

When several configurations are in the box (Lansinoh Thrive: in-bra cups *and* a bottle kit), the most hands-free one wins. **Portability is not a category input**: a handle, rechargeable battery, clip or "portable" wording never makes a pump a different category. The former traditional/portable split is replaced by the `portability` attribute.

Current results: flange-and-bottle electric 24, wearable 23, hands-free electric 11, manual 11, multi-user 4, unclassified 1 (Momcozy M6 — the page does not say whether it is an in-bra unit or a separate motor). 40 classifications rest on at least one inferred attribute (usually mechanism inferred from power sources) and are flagged `usesInferred`.

### Attribute definitions

| Attribute | Definition |
|---|---|
| `handsFree` | `as-sold` — hands-free with what is in the box (in-bra unit, included in-bra cups, or an included pumping bra). `with-accessories` — hands-free only with separately sold items (pumping bra, bustier, cups); evidence must name the accessory. Unknown when not stated (e.g. Willow Wave: worn in-bra but squeezed by hand). A wearable described only as "wearable" is `as-sold` **inferred**. |
| `powerSources` | Modes the pump **operates** in: `mains`, `built-in-battery`, `aa-batteries`, `battery-pack`, `none`. An included charger or "power adaptor" for a rechargeable pump is **not** `mains`. `mains` is verified only when the source mentions plugging in / AC / outlet / cord; it is inferred when an included adapter is the only power source listed and no battery is mentioned. |
| `batteryLife` | Pumping **duration** per charge in minutes (hours converted ×60). |
| `batterySessions` | Pumping **sessions** per charge, recorded only as the source states them — never converted to or from minutes. Ranges ("5–6 sessions") are stored as `up-to` the top of the range. |
| `weight` | `amount` + `unit` as stated, and `scope`: `motor` (pump/motor/main unit), `kit`, `single-wearable-unit` ("each"), `per-cup`, `pair`, or `unspecified` when the source does not say what was weighed. |
| `dishwasherSafe` | `{ parts, topRackOnly }`. `parts`: `all` only when the source says all/both/one-part; `some` when it names parts, milk-contact parts, or exclusions; else `unspecified`. `topRackOnly`: `true` only when "top rack" is stated, else `null`. |
| `maxSuction`, `noise`, `capacity`, … (`Measure`) | `comparator`: `eq` (plain number), `up-to` ("up to", "≤", "max", or a range "30–250"), `lt` ("less than", "under", "<", "nearly"), `at-least` ("over", "more than", "6+"), `approximately` ("about", "≈", "on average"). If any quote for the value says "up to", `up-to` wins. Negative vacuum figures are stored as magnitudes. |
| `portability` | Stated features only: `carry-handle`, `clip-or-lanyard`, `pocket-or-bag-sized`, `cordless-operation`. |
| `pumping` | `single` · `double` · `single-or-double`, from explicit wording. Purchase-option selectors ("Single / Double" packs) are not used. |

### Coverage — before and after remediation

| Attribute | Before: V / C / U | After: V / I / C / U |
|---|---|---|
| category → *derived* | 73 / 0 / 1 | derived 73 · unclassified 1 |
| mechanism *(new)* | — | 32 / 42 / 0 / 0 |
| collection *(new)* | — | 64 / 6 / 0 / 4 |
| multiUser *(new)* | — | 7 / 0 / 0 / 67 |
| pumping | 25 / 0 / 49 | 36 / 0 / 0 / 38 |
| power → powerSources | 59 / 0 / 15 | 53 / 15 / 0 / 6 |
| batteryLife | 17 / 2 / 55 | 22 / 0 / 2 / 50 |
| batterySessions *(new)* | — | 20 / 0 / 0 / 54 |
| portability *(new)* | — | 17 / 0 / 0 / 57 |
| weight | 23 / 0 / 51 | 23 / 1 / 0 / 50 |
| maxSuction | 38 / 1 / 35 | 39 / 0 / 1 / 34 |
| suctionLevels | 45 / 0 / 29 | 45 / 0 / 0 / 29 |
| noise | 21 / 1 / 52 | 21 / 0 / 1 / 52 |
| handsFree | 35 / 0 / 39 | 36 / 10 / 0 / 28 |
| closedSystem | 31 / 0 / 43 | 36 / 4 / 0 / 34 |
| dishwasherSafe | 23 / 0 / 51 | 24 / 0 / 0 / 50 |
| cleaning | 24 / 1 / 49 | 25 / 0 / 1 / 48 |
| capacity | 36 / 3 / 35 | 39 / 0 / 3 / 32 |
| includedItems | 53 / 0 / 21 | 53 / 0 / 0 / 21 |
| features | 26 / 0 / 48 | 26 / 0 / 0 / 48 |
| **Total** | **529 verified of 1,110** | **618 verified + 78 inferred of 1,406** |

52 attributes moved from unknown to established (50 verified, 2 inferred) once the extraction process was fixed; 27 were moved from verified to **inferred** because the source does not state them outright (14 power, 10 hands-free, 2 closed-system, 1 unit conversion). Unknowns remain where manufacturers do not publish the value — most often noise, weight, battery runtime in minutes, and dishwasher safety.

### Recorded conflicts (unchanged; awaiting independent resolution)

| Product | Attribute | Candidates | Note |
|---|---|---|---|
| Motif Roam | batteryLife | up to 90 min · up to 120 min | FAQ also says "approximately 120 minutes" |
| Motif Luna with Battery | batteryLife | over 2 hours · up to 4+ hours | FAQ also says "over 4 hours" |
| Momcozy M6 | maxSuction | -285 to -300 mmHg · 295 mmHg | |
| Momcozy S9 Pro | noise | <45 dB · 50 dB | |
| Lansinoh Wearable | cleaning | 3 parts · 4 parts | |
| Lansinoh NaturalWave | capacity | "5 oz/60 ml" (units disagree) | |
| Zomee Fit | capacity | 6 oz · 150 ml | Fullness-sensor settings (4/5/6 oz) lean toward 6 oz |
| BabyBuddha Wearable | capacity | more than 6 oz · 8 oz | |
| Medela Sonata | batteryLife | 1.5 hours · up to an hour | Added 2026-11-11 (trust-audit correction). The instructions for use give no runtime. |

### Corrections after the catalog trust audit (2026-11-11)

Targeted fixes for the three FAIL findings in `docs/CATALOG_TRUST_REPORT.md` (N-01, N-04, N-05). The coverage table above is the remediation snapshot and is not updated here; `docs/CATALOG_EXPORT.json` reflects the current catalog.

| Product | Attribute | Before | After | Source |
|---|---|---|---|---|
| Medela Sonata | powerSources | verified `[built-in-battery]` | verified `[mains, built-in-battery]` | Sonata instructions for use, §10 "Powering Your Breast Pump" |
| Medela Sonata | batteryLife | verified 90 min | conflicting: 90 min · up to 60 min | product page (feature copy vs FAQ) |
| Medela Pump In Style Pro+ Traditional | weight | unknown | verified 715 g, exact, pump unit (`motor`) | Pro+ instructions for use linked from the Traditional page, Technical Specifications |
| BabyBuddha 3.0 | suctionLevels | 3 modes listed | 4 modes, 30 settings (6 / 9 / 9 / 6) | product page |

### Recording rules

- **Manufacturer US pages only**, plus the model's own manufacturer instructions for use (PDF) when its product page links them. Supplier and retailer pages are never used for specifications. Customer reviews, related-product carousels, site navigation, and multi-product comparison tables are never evidence.
- **Verbatim quotes**, matched after normalizing whitespace, zero-width characters and typographic quote marks only.
- **Ambiguous context → unknown with a note** (e.g. Spectra SG weight appears only in a feature block written for the SG Portable; eufy battery/capacity appear only in a comparison table).
- **Variants vs bundles.** Separately sold configurations with different specs are separate records; `variantOf` is set only when the manufacturer presents one as a version of the other (Motif Luna with Battery). Bundles and adapters are excluded (Zomee Manual is a "Manual Hand Pump Adapter"). Evenflo Advanced and Deluxe Advanced share identical copy and are separate records with no variant claim.
- **Currently marketed only.** Philips Avent SCF393/52, SCF394/52 and SCF394/62 are marked "Discontinued" on Philips' US site and are excluded.

### Extraction process (v2)

`scripts/catalog/fetch.py` fetches pages (robots.txt honored, unreadable robots.txt treated as disallowed, 5 s spacing, 429 back-off, descriptive User-Agent). `scripts/catalog/region.py` extracts each page's **product region**: `<main>` (or the body from the page's `<h1>` when there is no `<main>`), minus `<nav>/<header>/<footer>/<aside>`, minus related-product blocks (until the next FAQ/spec heading) and review blocks (until the next brand-voice section), plus the page title and meta description.

v1 had two rules that hid real specifications and are removed: dropping lines shared by ≥50% of a brand's pages (this hid Spectra's "Closed System — Prevents backflow into tubing or pump.") and keeping at most 3 lines per attribute tag (navigation lines used up the quota, hiding e.g. Willow 360's battery and Zomee Fit's "only four washable parts").

### Verification

**Automated, offline (`npm test`)**

- *Integrity* (`lib/products/catalog.test.ts`): ≥50 models; unique ids and brand+model names; variants point to existing base records; every attribute present with a valid status; every verified/inferred value has a non-empty quote; every cited source is declared, used, https, on a manufacturer host, dated; conflicts have ≥2 differing candidates; unknowns carry no value; mechanism established for every product; collection unknown only where noted; **no price / shipping / stock / coverage keys on products**.
- *Semantics* (`lib/products/semantics.test.ts`): each stored number appears in a quote **with its unit**; the stored comparator matches the qualifier next to the number ("up to", "<", "over", "+", ranges, "about"), and an exact value is rejected if the source qualifies it; hands-free / power / battery / dishwasher / weight-scope values follow the definitions above; inferred values carry a rationale; evidence from another page is flagged `brand-wide` or `other-product`; quotes naming another catalog model are not attributed to this model (one documented comparative exception); variant-specific evidence stays on the variant record; every product except Momcozy M6 classifies; portability never drives classification; `usesInferred` is accurate.
- *Commerce separation* (offer, supplier, scenario and grounding tests): unchanged from Milestone 1.5.

**Automated, opt-in (`SOURCE_SNAPSHOTS=<region dir> npx vitest run lib/products/verify-sources.test.ts`)** — requires snapshots from `region.py`:

- every quote (verified, inferred, conflicting) appears verbatim **inside the product region** — not in navigation, related products, or reviews;
- Aeroflow listing names appear on the saved listing page and sitemap URLs match exactly;
- an attribute left unknown while its product region carries a strong signal (an "NNN mmHg" figure, "NN dB", "closed system", "dishwasher", battery-runtime wording) must carry a note explaining why.

On 2026-10-28: 1,555 checks passed. Snapshots are not committed (third-party content).

**Human review required**

- Whether a quote that names the product actually describes *this* variant when a page sells several (e.g. single vs double packs).
- Whether a feature block on a page is about the page's model or reused copy for a sibling model (Spectra SG vs SG Portable).
- Whether inferred values and their rationales are reasonable.
- Whether a newly published spec exists that the signal patterns do not cover (e.g. weight, capacity).
- Resolving recorded conflicts (manufacturer manuals or direct confirmation).
- Residual review text that the region extractor does not recognize (first-person lines are spot-checked, not proven absent).

## B. Supplier catalog

- **Real suppliers** (`lib/suppliers/real.ts`)
  - **Aeroflow Breastpumps** — listings collected: model name and URL only, from `/breast-pumps/` (page 1; pagination uses query strings, which robots.txt disallows) and `sitemap.xml`. 53 observations: 18 with names verbatim from the listing page, 35 from sitemap URLs. **No prices are stored**: displayed prices are retail, carry a "partially covered… co-pay or deductible" disclaimer, and say nothing about any specific plan.
  - **Yummy Mummy** — not collected. Its terms of service prohibit copying site content without prior written consent, and robots.txt disallows the insurer/region listing pages.
- **A listing is not evidence of coverage.** Listing observations are never read by the offer engine.
- **Simulated suppliers** (`lib/suppliers/simulated.ts`) — 12 fictional suppliers with `provenance: "simulated"`. Names must not resemble real suppliers or pump brands.

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

Every `Quote` carries `provenance` — `{ kind: "simulated", label }` or `{ kind: "supplier-api", supplierId, retrievedAt, reference }` — and `charges` (`pumpOutOfPocketCents`, `shippingCents`, `otherMandatoryCents`, `totalOutOfPocketCents`), each **`null` when the provider did not supply it**.

The simulated provider covers a product only through its **derived** classification: plans list covered categories (`flange-bottle-electric`, `hands-free-electric`, `wearable`, `manual`; none cover `multi-user`), and an unclassified product gets an `unverified` quote (`category-unverified`). The remediation renamed categories but left every simulated quote, status, charge, and scenario result identical (191/191 entries compared).

### Free-pump rule

`isQualifyingFreeOffer` accepts a quote only if status is `fully-covered`, `inStock === true`, and pump, shipping, other mandatory, and total charges are all known and exactly 0. Unknown charges never qualify. `findFreeOffers` returns `free_offers_found`, `no_free_offers` (empty, no paid fallback), or `coverage_unverified` (`unknown_plan` / `verification_failed`).

### Simulated shipping policy

For the hackathon demo, **every simulated insurance pump offer ships free**: `SIMULATED_SHIPPING_CENTS = 0`, applied to every quote from `SimulatedQuoteProvider` and enforced by tests. This is a demo business rule only — not a claim about any real supplier and not a legal guarantee. Free shipping ≠ free pump: Scenario B's $75 offer ships free but costs $75. Real quotes must take shipping from authoritative supplier data.

### Simulated data

`lib/offers/simulated/data.ts`: 4 fictional plans, 47 offerings across 9 real catalog products, one coverage override. Simulated list prices are invented and are not the products' real retail prices.

| Scenario | Plan | Guarantee |
|---|---|---|
| A — Multiple free options | Evergreen PPO, flange-and-bottle electric | 8 qualifying $0 offers from 6 suppliers |
| B — Same pump, different price | Evergreen PPO, Medela Pump In Style Pro | $0 at Bloom Maternity (5-day), $75 at MamaMend (4-day), both free shipping; $0 ranks first; $75 never in free search |
| H — Order timeout | Summit EPO, Spectra S2 Plus at Coastal Care | Qualifying $0 selection; timeout → `pending-reconciliation`; idempotency key required (behavior in Milestone 4) |

## Grounding for Claude

`buildGroundingContext({ productIds, quotes })` returns rules, product facts — the derived classification with its basis, **verified** values (manufacturer statements) with citations, **inferred** values with rationale, conflicting candidates, unknown attributes — and offer facts copied verbatim from provider quotes with their provenance. Each citation carries its `scope` and `section`. Claude must present inferred values as PumpPath's interpretation, disclose brand-wide or other-product evidence, and never compute eligibility, prices, stock, or delivery.

## Future real supplier integrations

Verified plan-specific pricing cannot be obtained from public pages: suppliers show plan cost only after collecting insurance, personal, and prescriber details, which PumpPath does not collect. A real `QuoteProvider` needs a supplier partnership/API returning eligibility, stock, and itemized member charges (including shipping) with permission to display them, or an eligibility-verification integration with HIPAA-compliant handling. It must return `provenance.kind = "supplier-api"`, leave charges `null` when unknown, and never default shipping to $0.
