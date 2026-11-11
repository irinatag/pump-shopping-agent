# PumpPath Catalog Trust Report — pre-Milestone 2

**Audit date:** 2026-11-10 (live re-fetch completed 2026-11-11) · **Catalog commit:** `23d0d89` (branch `catalog-data-quality-remediation`) · **Type:** audit only. No catalog, engine, provider, test, or source-evidence file was changed.

**Machine-readable results:** [`docs/CATALOG_TRUST_AUDIT.json`](CATALOG_TRUST_AUDIT.json) (schema `pumppath.catalog-trust-audit/v1`). It holds catalog totals, remediation statuses, new findings, all 40 audited attributes with evidence and per-criterion results, coverage per attribute and per product, 30 grounding cases with payload checks and expected model behaviour, and regression results.

---

## 1. Executive summary

**Verdict: READY WITH LIMITATIONS.**

The catalog is trustworthy at the level that matters most for Milestone 2. Every stored quotation is still verbatim on the live manufacturer page, and nothing commercial leaks into product records. The free-only rule is airtight. The grounding layer never upgrades an unknown, inferred, or conflicting value to a verified one.

It is **not** yet trustworthy as a source of complete comparisons. Coverage is thin for weight, noise, battery runtime, and dishwasher safety. Some values that pass every automated check are still incomplete or under-scoped.

| Area | Result |
|---|---|
| Remediation (I-06 – I-16) | **6 RESOLVED, 5 PARTIALLY RESOLVED, 0 UNRESOLVED** |
| Live source check | **73/73** manufacturer pages re-fetched; **0** quotes drifted (1,502 verifier checks pass; the 53 failures are supplier-listing checks for pages deliberately not fetched) |
| 40-attribute independent audit | **36 PASS · 3 NEEDS REVIEW · 1 FAIL**. Targeted re-checks 10/10 PASS; random sample 26 PASS / 3 NEEDS REVIEW / 1 FAIL |
| New catalog-wide findings | **16**: 3 FAIL-level (one missing power mode, one missed weight, one incomplete enumeration), 13 NEEDS REVIEW |
| Comparison readiness | 14 of 74 products cover ≤ 2 of 7 comparison dimensions; noise and weight are known for under a third of products |
| Grounding payload | 43/54 adversarial checks pass. All 11 failures are *missing guidance or context*, none is a status promotion. **Claude's actual responses were not tested: there is no Claude integration yet.** |
| Regression | test, typecheck, lint, and build all exit 0. Scenarios A, B, H are unchanged. Free-only requires a known $0 for pump, shipping, other mandatory charges, and total. All 188 simulated quotes are labelled simulated. |

Passing tests did not drive this verdict. The tests passed throughout, yet the audit found a FAIL-level power error (Medela Sonata), a missed stated weight, and an incomplete suction-mode list. All three passed every automated check.

---

## 2. Remediation status (I-06 – I-16)

Each finding was re-checked against current code, the current catalog values, and the **live** page, not against the remediation notes.

| ID | Original issue | Implemented correction | Current evidence (2026-11-10 live) | Status | Remaining risk |
|---|---|---|---|---|---|
| I-06 | Lansinoh NaturalWave stored `traditional-electric`; its evidence described portability | Category no longer stored. Derived `flange-bottle-electric` from `mechanism` + `collection`; handle moved to `portability` | Live box list: "2 Flange Bodies", "2 ComfortFit Flanges 25 mm", "2 Lansinoh Bottles". Audit item T01 PASS | **RESOLVED** | None for classification. The capacity conflict ("5 oz/60 ml") is still live on the page. |
| I-07 | Medela Sonata category rested on "smart breast pump" | Derived `flange-bottle-electric` from "1 x Double pumping kit" + storage bottles | Both lines live in "What's included" (T02 PASS) | **RESOLVED** | Separate new error on the same record: `powerSources` omits mains, which the page states (**N-01**). |
| I-08 | Spectra S1 Plus / S2 Plus `closedSystem` falsely unknown, with a false note | Verified from the product's own "Closed System / Prevents backflow into tubing or pump." block; 9 Plus fixed too | Block is live on S1 Plus (T03) and S2 Plus (R23), in each product's own feature list | **RESOLVED** | None. |
| I-09 | 10 categories rested on product titles | Category is derived; "traditional vs portable" retired | All 10 original records now classify from box-list evidence (flanges + bottles) | **PARTIALLY RESOLVED** | The pattern moved from category to `collection`. 11 `in-bra-wearable` values (→ `wearable`) rest on the product name or "fully wearable" alone (**N-03**). Live check: GLO's page supports it elsewhere (R01); the S12 Pro Quick page does not (R18). |
| I-10 | Momcozy V3 category vs hands-free | `collection: external-unit-with-in-bra-cups` → `hands-free-electric` | Live FAQ: "corded, plug-in tabletop breast pump"; "3-part wearable collectors" (T05 PASS) | **RESOLVED** | None. |
| I-11 | Borrowed / cross-page evidence used silently | `scope` (`brand-wide` / `other-product`) and `section` on every evidence item; test-enforced; surfaced in grounding citations | All 6 cross-page evidence items are flagged (5 brand-wide, 1 other-product); no unflagged cross-page evidence. Symphony PLUS meta description is live, and the live body now says "hospital-grade (multi-user)" (T06 PASS) | **RESOLVED** | Provenance is visible, but Zomee W1 `closedSystem` is **verified** with brand-wide evidence as its only support (**N-09**). Symphony PLUS could now cite body copy instead of metadata. |
| I-12 | `handsFree` semantics undefined and inconsistent | `as-sold` / `with-accessories` defined; wearables named only "wearable" are `as-sold` **inferred**; test-enforced | All 8 `with-accessories` records name the accessory, and none of their box lists contains a bra or hands-free cups. PIS Pro FAQ live (T08 PASS) | **RESOLVED** | `as-sold` is still verified from page titles for GLO, M6, and eufy S2 Pro. That is allowed by the rule, but it is title-only evidence. |
| I-13 | `power: "ac-adapter"` conflated chargers with mains | `powerSources` = operating modes; a charger is not mains; adapter-only pumps marked inferred | S2 Plus inferred mains confirmed: no battery anywhere on the live page (T09 PASS) | **PARTIALLY RESOLVED** | The fix removed false *positives* but lists have no completeness semantics. 43 records are verified `["built-in-battery"]`, which reads as "battery only". Medela Sonata's live page says it runs "plugged in to a power outlet" but the record says battery only (**N-01**, **N-02**). |
| I-14 | Stated attributes recorded as unknown (extraction hid lines) | Extractor v2; 152 candidates reviewed; 52 attributes established; unknown-with-signal check | Zero unknown-with-signal failures on 73 live pages | **PARTIALLY RESOLVED** | The signal check has no weight pattern. PIS Pro+ Traditional weight is unknown although the live page says "Under-2-pound" (**N-04**). eufy S2 Pro battery "6.5 Hour" sits in a comparison block the rules exclude. |
| I-15 | Closed-system inferences recorded as verified | PIS Pro, SG, Momcozy V1/V2 Pro now **inferred** with rationale | SG rationale confirmed live: the explicit block follows SG Portable copy (T04 PASS) | **PARTIALLY RESOLVED** | The rule is applied inconsistently. Anti-backflow wording is *inferred* for SG and Momcozy V1/V2 but *verified* for Zomee Fit and W1 (**N-09**). |
| I-16 | Weight scope and comparator normalization | Comparator and scope definitions; a test checks unit and adjacent qualifier for every number | M5 Smart weight scope `unspecified` correct (T10 PASS); every number passes the semantic test | **PARTIALLY RESOLVED** | Qualifiers outside the number window are lost. Elvie Stride's 300 mmHg is "in a single cup set up". Luna with Battery "up to 4+ hours" is stored `up-to` although "+" is a lower bound. Thrive capacity 6 oz covers the hands-free cups only (R07). (**N-08**) |

The prior audit's sampled items (S02, S03, S06, S07, S08, S13) and the 10 targeted items above were re-verified live. Every one is consistent with its remediated encoding.

---

## 3. Catalog-wide integrity results

### Totals

| Measure | Count |
|---|---|
| Product records | **74** (73 distinct US models + 1 declared variant: Motif Luna with Battery) |
| Brands | 12 (Elvie pages are now hosted on onewillow.com) |
| Sources | 73, all `manufacturer-page`, all https, all on the brand's US host, all `accessedOn` 2026-10-28 |
| Attribute slots | 1,406 (74 × 19) |
| **Verified** | **618** (44.0 %) |
| **Inferred** | **78** (5.5 %) |
| **Conflicting** | **8** (0.6 %) |
| **Unknown** | **702** (49.9 %) |
| Evidence items | 1,209 (1,203 this-product · 5 brand-wide · 1 other-product; 9 page-title, 1 page-metadata) |
| Derived classifications | flange-bottle-electric 24 · wearable 23 · hands-free-electric 11 · manual 11 · multi-user 4 · **unclassified 1** (Momcozy M6) |
| Classifications resting on ≥1 inferred attribute | 40 (flagged `usesInferred`) |
| **Unsupported / weakly supported classifications** | **1 unclassified** + **11 wearable classifications whose `collection` evidence is the product name only** (N-03) + **55 electric classifications that silently assume `multiUser = false` from an unknown** (N-10) |

### Checks

| Check | Result | Notes |
|---|---|---|
| Real US manufacturer and model identity | PASS with notes | Every source is on the manufacturer's US site. Edition naming is loose in places: Momcozy "S9 Pro" vs the page's "S9 Pro … Upgraded", and the M5 URL "upgraded-with-app-control". Elvie Pump's page sells Single and Double configurations under one record (N-12). |
| Variant associations | PASS | One declared variant. Luna vs Luna with Battery noise (<39 vs <40 dB) and power are kept apart; test-enforced. |
| Duplicate or misleading records | NEEDS REVIEW | No duplicate ids or names. Evenflo Advanced and Deluxe Advanced have identical established facts. eufy S2 and S2 Pro carry identical suction, noise, and cleaning quotes. Neither pair can be told apart from catalog facts (N-11). |
| Valid source references | PASS | Every evidence item cites a declared source. Every cross-page item is flagged. No unused sources. |
| No retail prices, insurance, stock, or shipping in product records | PASS | Zero commerce keys. A text scan found only a false positive ("full-coverage warmth"). Live product *regions* do contain prices and insurance calls-to-action (e.g. "$175.94 Sale", "Get … Through Insurance"); none has reached a record (N-15). |
| Consistent classification rules | PARTIAL | Rules are deterministic and test-enforced, but evidence strength differs. Name-only wearable evidence (N-03) and the unknown-multiUser default (N-10) are not disclosed in the classification basis. Elvie Curve's `in-bra-wearable` contradicts that value's "motor + collector" definition (N-16). |
| Hands-free semantics | PASS | Definitions are applied consistently (see I-12). |
| Power semantics | **FAIL (1) / NEEDS REVIEW** | Medela Sonata omits mains (N-01). Single-item lists carry no completeness flag (N-02). |
| Weight scope and numeric qualifiers | NEEDS REVIEW | Scopes are faithful. Qualifiers are lost in 3 cases (N-08). |
| Cleaning and dishwasher claims limited to supported components | NEEDS REVIEW | Freestyle, Thrive, Signature Comfort, Manual, Willow Wave, and GLO are scoped correctly (`some`). Willow 360, Willow Go, and PIS Hands-free `all`, and 10 `unspecified` records, have no component scope (N-07). Roam's cleaning value drops the source's "except the motor and tubing" (N-06). |
| Unknown / inferred / conflicting handling | PASS with one exception | Unknowns carry no value, and every unknown whose live page carries a strong signal has an explanatory note (0 verifier failures). Every inferred value has a rationale. Conflicts are never resolved by picking a value. Exception: the Luna with Battery "conflict" ("over 2 hours" vs "up to 4+ hours") is two compatible lower bounds, with the second mis-encoded as `up-to` (N-08). |

### New findings (not in the prior audit)

| ID | Sev. | Status | Finding |
|---|---|---|---|
| N-01 | High | **FAIL** | Medela Sonata `powerSources` is verified `["built-in-battery"]`. The live page says "you can use it plugged in to a power outlet" and "still operable … when plugged into an external power source". |
| N-02 | High | NEEDS REVIEW | List attributes have no completeness flag. 43 verified `["built-in-battery"]` lists read as "battery only", including pumps whose box lists an AC adapter (S1 Plus, 9 Plus, S3 Pro, Pearl, Z2, Duo, Luna with Battery). |
| N-03 | Med | NEEDS REVIEW | 11 `in-bra-wearable` values (driving 11 `wearable` classifications) rest on the product name or "fully wearable" only. |
| N-04 | Med | **FAIL** | PIS Pro+ Traditional `weight` is unknown; the live page says "Under-2-pound" twice. The unknown-with-signal check has no weight pattern. |
| N-05 | Med | **FAIL** | BabyBuddha 3.0 `suctionLevels` lists 3 modes. The page says "four pumping modes and 30 total settings" and lists a fourth (R03). |
| N-06 | Med | NEEDS REVIEW | Composite cleaning strings contain content absent from their quotes. Roam drops the "and tubing" exclusion. |
| N-07 | Med | NEEDS REVIEW | Dishwasher `parts: all` / `unspecified` has no component scope, so "the pump is dishwasher safe" is an easy misreading. |
| N-08 | Med | NEEDS REVIEW | Lost qualifiers: Stride "single cup set up", Luna with Battery "4+", Thrive cup-only capacity. |
| N-09 | Low | NEEDS REVIEW | Closed-system rule inconsistent: Zomee anti-backflow wording verified, SG and Momcozy inferred. |
| N-10 | Med | NEEDS REVIEW | `multiUser` unknown (67 records) is silently treated as personal-use. 55 of these are electric records that drive coverage. |
| N-11 | Low | NEEDS REVIEW | Indistinguishable sibling records (Evenflo Advanced/Deluxe; eufy S2/S2 Pro). |
| N-12 | Low | NEEDS REVIEW | Edition and configuration identity (Elvie Pump single/double; Momcozy "Upgraded" editions). |
| N-13 | Med | NEEDS REVIEW | Grounding payload gaps (section 6). |
| N-14 | Low | NEEDS REVIEW | DATA.md says S9 Pro battery is sessions-only, but `batteryLife` is verified 270 min. DATA.md cites 191 simulated quotes; the provider returns 188. |
| N-15 | Low | NEEDS REVIEW | Extracted product regions contain retail prices and insurance CTAs; no leakage into records today. |
| N-16 | Low | NEEDS REVIEW | Elvie Curve `collection` contradicts its schema definition (classification unaffected). |

---

## 4. 40-attribute independent source audit

### Method

- **Live re-fetch.** All 73 manufacturer pages were re-fetched on 2026-11-10/11 into a fresh scratch directory with the repo's own `scripts/catalog/fetch.py` (robots.txt honoured, 5 s spacing). Spectra rate-limited 6 pages (HTTP 429), which were retried once at 60 s spacing and all succeeded. Product regions were extracted with `scripts/catalog/region.py`. Nothing was saved in the repo.
- **What each verdict required.** For every attribute I read the quote's surrounding lines on the live page and judged it on the seven criteria below. Matching the old snapshot was not enough to pass.
- **Manuals.** Not consulted. Only product pages were used, so conflicts were not resolved.

**Selection (reproducible).**
- **Random set (R01–R30).** Seed `20261110`. Population: all 597 *verified* attributes, excluding the 20 attributes sampled in the prior audit and the 10 targeted ones.
- **Allocation.** 30 slots across the 12 brands, proportional to each brand's verified count, minimum 1 per brand, largest-remainder rounding. Quotas: Medela 6, Momcozy 4, Lansinoh 3, Motif 3, Spectra 3, and 1–2 for each other brand.
- **Draw.** Within each brand, a seeded shuffle of `(productId, attribute)` sorted by id, taking items in order with at most 2 per product. No hand selection.
- **Result.** 29 models across 12 brands. The full algorithm is in the JSON's `attributeAudit.selection`.
- **Targeted set (T01–T10).** Previously failing or corrected attributes: I-06, I-07, I-08, I-15/S07, I-10, I-11, I-14, I-12/S02, I-13/S06, I-16/S13.

**Criteria columns:**
- **M** model/variant match
- **A** source authenticity
- **Q** quotation accuracy (verbatim in the live product region)
- **I** interpretation
- **U** units and qualifiers
- **S** evidence scope
- **F** freshness

✓ pass · ⚠ review · ✗ fail. All sources were accessed 2026-10-28 and re-checked live 2026-11-10/11. All 40 quotes were still present verbatim in the live product region.

| # | Product | Attribute | Status | Stored value | Evidence URL | M A Q I U S F | Verdict | Reason |
|---|---|---|---|---|---|---|---|---|
| T01 | Lansinoh NaturalWave Double Electric | collection | verified | ["flanges-and-bottles"] | [link](https://lansinoh.com/products/naturalwave-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live box list: '2 Flange Bodies', '2 ComfortFit Flanges 25 mm', '2 Lansinoh Bottles'. Flanges + bottles stated; handle/battery correctly kept out of classification. |
| T02 | Medela Sonata Smart Double Electric | collection | verified | ["flanges-and-bottles"] | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/classic-electric/sonata-smart-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live 'What's included': '1 x Double pumping kit', breast shields, '4 x 5oz. storage bottles with lids'. |
| T03 | Spectra S1 Plus | closedSystem | verified | true | [link](https://www.spectrababyusa.com/products/spectra-s1-plus-premier-rechargeable-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live S1 Plus feature block: 'Closed System / Prevents backflow into tubing or pump.' on its own page; the old false-unknown note is gone. |
| T04 | Spectra Synergy Gold (SG) | closedSystem | inferred | true | [link](https://www.spectrababyusa.com/products/spectra-sg-synergy-gold-double-adjustable-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Correctly inferred, not verified. Live SG page: own feature list says 'Backflow protection to prevent contamination'; the explicit 'Closed System' block follows the line 'The Spectra SG Portable uses independent adjustability...', exactly as the rationale states. |
| T05 | Momcozy V3 Double Electric | collection | verified | ["external-unit-with-in-bra-cups"] | [link](https://momcozy.com/products/v3-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live FAQ: 'corded, plug-in tabletop breast pump' (external unit) and '3-part wearable collectors' (in-bra cups) on the V3's own page. |
| T06 | Medela Symphony PLUS | multiUser | verified | true | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/symphony-and-sets/symphony-plus-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ⚠ | **PASS** | Live meta description supports it, and the live body now also states 'Symphony PLUS ® is a hospital-grade (multi-user) breast pump'. Recommend re-citing the body line instead of page metadata. |
| T07 | Willow Willow 360 | batterySessions | verified | up to 5 sessions | [link](https://onewillow.com/products/willow-pump-360) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live feature list: 'Rechargeable battery that lasts up to 5 pumping sessions'; sessions kept separate from minutes. |
| T08 | Medela Pump In Style Pro | handsFree | verified | with-accessories | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/classic-electric/pump-in-style-pro-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live FAQ under accessories: hands-free cups 'purchase ... separately'; box list has no hands-free cups or bra. |
| T09 | Spectra S2 Plus | powerSources | inferred | ["mains"] | [link](https://www.spectrababyusa.com/products/spectra-s2-plus-premier-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Inferred, and labelled so. Live page: adapter is the only power item; no battery, plug or outlet wording anywhere in the product region. |
| T10 | Momcozy M5 Smart | weight | verified | 230 g (unspecified) | [link](https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live spec block 'Weight: 230 g' with no statement of what was weighed; scope 'unspecified' is faithful. |
| R01 | Ameda GLO Wearable | collection | verified | ["in-bra-wearable"] | [link](https://www.ameda.com/products/glo-wearable-breast-pump) | ✓ ✓ ✓ ⚠ ✓ ✓ ✓ | **NEEDS REVIEW** | Value is right (live page: 'place the collection cups inside your bra'; box: '2 motors, 2 cups'), but the cited evidence is only the product name 'GLO® Wearable Breast Pump', which does not establish 'self-contained, no external unit'. |
| R02 | Ameda Pearl | maxSuction | verified | up to 250 mmHg | [link](https://www.ameda.com/products/ameda-pearl-hospital-grade-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live 'Technical Features': 'Expression: 30 - 250mmHg'; range top stored as up-to 250. |
| R03 | BabyBuddha BabyBuddha 3.0 | suctionLevels | verified | Soft Stimulation 6, Classic Expression 9, Double Drop Expression 9 levels | [link](https://babybuddhaproducts.com/products/buddha-3-0) | ✓ ✓ ✓ ✗ ✓ ✓ ✓ | **FAIL** | Live page: 'Choose from four pumping modes and 30 total settings' followed by four lines; the stored value lists only three modes and omits 'Classic Stimulation with 6 levels'. Quotes are accurate, but the value is incomplete in a way that misstates the mode count. |
| R04 | BabyBuddha Manual Breast Pump | capacity | verified | 4.7 oz | [link](https://babybuddhaproducts.com/products/babybuddha-manual-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live 'What's in the Box': '1 Wide-Neck Bottle (4.7 Ounces)'. |
| R05 | Elvie Elvie Pump | batterySessions | verified | up to 6 sessions | [link](https://onewillow.com/products/elvie-pump-ultra-quiet-ultra-discreet-wearable-breast-pump) | ⚠ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live page: 'lasts 5-6 pumping sessions'; range stored as up-to 6 per DATA.md. The page sells Single and Double configurations under one record; sessions are per pump either way. |
| R06 | Evenflo Pocket Portable Double Electric | portability | verified | ["pocket-or-bag-sized", "clip-or-lanyard"] | [link](https://www.evenflofeeding.com/products/pocket-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: 'fits in any bag and clips to your waistband' under 'Compact and Portable'. |
| R07 | Lansinoh Thrive 2-in-1 | capacity | verified | 6 oz | [link](https://lansinoh.com/products/lansinoh-thrive-pump) | ✓ ✓ ✓ ✓ ✓ ⚠ ✓ | **NEEDS REVIEW** | '2 Hands-free collection cups (6 oz)' is accurate, but the box also contains a PowerPump kit with 5 oz bottles. A single product-level capacity of 6 oz has no component scope. |
| R08 | Lansinoh DiscreetDuo Flow | collection | verified | ["in-bra-wearable"] | [link](https://lansinoh.com/products/discreetduo-flow-wearable-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live description: 'hands-free breastfeeding pump with no cords or tubes'; instructions: 'Place in bra'. Supports a self-contained in-bra unit. |
| R09 | Lansinoh Signature Comfort | dishwasherSafe | verified | parts=some, topRackOnly=None | [link](https://lansinoh.com/products/signature-comfort-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: 'dishwasher-safe breastmilk expression set parts'; parts='some' is correctly scoped. |
| R10 | Medela Pump In Style Pro+ Hands-free Rechargeable | includedItems | verified | 6 items | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/hands-free-electric/pump-in-style-pro-hands-free-rechargeable-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | All six items present verbatim in the live 'What's included' list, in order. |
| R11 | Medela Freestyle Mini Hands-free | portability | verified | ["clip-or-lanyard"] | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/hands-free-electric/freestyle-mini-hands-free-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live box list: 'Adjustable lanyard with clip-on feature (1x)'. |
| R12 | Medela Sonata Smart Double Electric | closedSystem | verified | true | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/classic-electric/sonata-smart-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live 'Overflow Protection': 'Closed system at the kit prevents milk from entering the tubing & motor.' |
| R13 | Medela Motion InBra | batteryLife | verified | up to 150 min | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/inbra-electric/motion-inbra) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live FAQ: 'lasts up to 2.5hr ... or up to 10 pumping sessions', with Medela's own note that a session averages 15 min. |
| R14 | Medela Pump In Style Pro+ Traditional Rechargeable | suctionLevels | verified | 16 adjustable suction levels | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/classic-electric/pump-in-style-pro-traditional-rechargeable-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live feature bullet: 'With 16 adjustable suction levels'. Same page states 'Under-2-pound' design, but catalog weight is unknown (missed attribute, see N-04). |
| R15 | Medela Pump In Style Hands-free | weight | verified | 535 g (motor) | [link](https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/hands-free-electric/pump-in-style-hands-free-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: 'Unit weight: 1.18 lbs / 535g (breast pump only)'; scope 'motor' is supported. The cups are listed separately at 77 g each. |
| R16 | Momcozy M6 Mobile Style | noise | verified | < 50 dB | [link](https://momcozy.com/products/momcozy-mobile-style-hands-free-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live spec block: 'Noise Level: Less than 50 dB'; comparator lt. |
| R17 | Momcozy V2 Pro | maxSuction | verified | 288 mmHg | [link](https://momcozy.com/products/v2pro-hands-free-breast-pump-ultra-light-potent) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: '-288mmHg Suction Power'; stored as magnitude, eq. |
| R18 | Momcozy S12 Pro Quick | collection | verified | ["in-bra-wearable"] | [link](https://momcozy.com/products/s12-pro-quick-wearable-breast-pump) | ✓ ✓ ✓ ⚠ ✓ ✓ ✓ | **NEEDS REVIEW** | Only evidence is the product name 'S12 Pro Quick Wearable Breast Pump'. No brand-voice line on the live page says in-bra or self-contained (only a customer review mentions 'cordless'). Classification 'wearable' depends on it. |
| R19 | Momcozy M5 Smart | suctionLevels | verified | 3 modes, 9 suction levels | [link](https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live spec block: 'Pumping Modes: 3' and 'Suction Levels: 9'. |
| R20 | Motif Duo | pumping | verified | double | [link](https://motifmedical.com/duo-portable-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live description: 'This double electric breast pump weighs less than a pound'. |
| R21 | Motif Roam | closedSystem | verified | true | [link](https://motifmedical.com/motif-roam) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live description: 'a hygienic closed system'. |
| R22 | Motif Roam | noise | verified | < 55 dB | [link](https://motifmedical.com/motif-roam) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: 'QUIET MOTOR / A quiet <55-decibel hum'; comparator lt. |
| R23 | Spectra S2 Plus | closedSystem | verified | true | [link](https://www.spectrababyusa.com/products/spectra-s2-plus-premier-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live feature block: 'Closed System / Prevents backflow into tubing or pump.' on the S2 Plus's own page (confirms the I-08 correction). |
| R24 | Spectra Premier Wearable | maxSuction | verified | 280 mmHg | [link](https://www.spectrababyusa.com/products/premier-wearable-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live spec list: 'Hospital-Strength: 280mmHg adjustable suction'; plain number, eq. |
| R25 | Spectra S3 Pro Multi-user | closedSystem | verified | true | [link](https://www.spectrababyusa.com/products/s3-pro-multiuser-hospital-grade-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live description: 'Engineered with a true closed system'. |
| R26 | Willow Wave Manual | includedItems | verified | 7 items | [link](https://onewillow.com/products/willow-wave-manual-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | All 7 items present verbatim in the live 'What's Included' list. |
| R27 | Willow Willow 360 | maxSuction | verified | up to 245 mmHg | [link](https://onewillow.com/products/willow-pump-360) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: '7 levels of smart, hospital-grade suction (up to -245mmHG)'. |
| R28 | Zomee Z2 | closedSystem | verified | true | [link](https://zomee.com/products/zomee-z2-double-electric-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live feature list on the Z2's own page: 'Closed system prevents milk from entering tubing'. |
| R29 | Zomee Mother's Nature W1 Warming Wearable | handsFree | verified | as-sold | [link](https://zomee.com/products/mothers-nature-w1-warming-wearable-breast-pump) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live: 'hands-free design fits discreetly in your bra'; self-contained wearable, so as-sold. |
| R30 | eufy Wearable Breast Pump S2 Pro | maxSuction | verified | 300 mmHg | [link](https://www.eufy.com/products/t600p181-eufy-wearable-breast-pump-s2-pro) | ✓ ✓ ✓ ✓ ✓ ✓ ✓ | **PASS** | Live feature bullet on the S2 Pro page: '... and 300 mmHg suction'; plain number, eq. Marketing context, not a spec table. |

**Tally:** targeted 10 PASS. Random 26 PASS · 3 NEEDS REVIEW (R01, R07, R18) · 1 FAIL (R03). The NEEDS REVIEW items share one root cause: the quote is real and current, but it supports less than the stored value implies (name-only evidence, or a value without component scope). That is the gap automated checks cannot see.

---

## 5. Attribute coverage and comparison readiness

### Per attribute (74 products)

| Dimension | Attribute | Verified | Inferred | Conflicting | Unknown | Known % |
|---|---|---|---|---|---|---|
| Architecture | derived classification | 33 (no inferred basis) | 40 (`usesInferred`) | — | 1 | 98.6 |
| | collection | 64 | 6 | 0 | 4 | 94.6 |
| | pumping (single/double) | 36 | 0 | 0 | 38 | 48.6 |
| Battery & power | powerSources | 53 | 15 | 0 | 6 | 91.9 |
| | batteryLife (minutes) | 22 | 0 | 2 | 50 | 29.7 |
| | batterySessions | 20 | 0 | 0 | 54 | 27.0 |
| Portability & weight | portability | 17 | 0 | 0 | 57 | 23.0 |
| | weight | 23 | 1 | 0 | 50 | 32.4 |
| Hands-free | handsFree | 36 | 10 | 0 | 28 | 62.2 |
| Cleaning | dishwasherSafe | 24 | 0 | 0 | 50 | 32.4 |
| | cleaning | 25 | 0 | 1 | 48 | 33.8 |
| Noise | noise | 21 | 0 | 1 | 52 | 28.4 |
| Suction | maxSuction | 39 | 0 | 1 | 34 | 52.7 |
| | suctionLevels | 45 | 0 | 0 | 29 | 60.8 |

Battery runtime needs care. Minutes and sessions are separate units and must not be converted. Only 47 of 74 products have *either* runtime figure (or are mains/manual-only). Neither figure is comparable across brands without the session-length assumption, which only Medela states (15 min).

### Per product (7 dimensions)

A dimension counts as covered when it is verified or inferred:

| Dimension | Covered when |
|---|---|
| Architecture | Classification derived |
| Battery & power | Power sources known, plus a runtime figure if battery-powered |
| Weight | Weight known |
| Hands-free | handsFree known |
| Cleaning | dishwasherSafe or cleaning known |
| Noise | Noise known |
| Suction | maxSuction known |

| Dimensions covered | Products |
|---|---|
| 7 | 1 (Momcozy M5 Smart) |
| 6 | 8 |
| 5 | 21 |
| 4 | 13 |
| 3 | 17 |
| 2 | 8 |
| 1 | 6 |

**Insufficient for meaningful comparison (≤ 2 of 7), 14 products:**

| Brand | Products |
|---|---|
| Evenflo | Advanced Double, Deluxe Advanced Double, Advanced Single, Advanced Manual, Pocket |
| Spectra | SG Portable, S3 Pro |
| Ameda | One-Hand Manual |
| BabyBuddha | 3.0, Manual |
| Lansinoh | NaturalWave, Smartpump 3.0 |
| Medela | PIS Pro+ Traditional, Symphony PLUS |

The Evenflo line (all 5 products) has architecture only.

**Marginal (3 of 7), 17 products.** This includes the Scenario H product family (Spectra S1 Plus 3/7; S2 Plus 4/7). Scenario B's Medela Pump In Style Pro has 5/7. Its noise and maximum suction are unknown ("vacuum range is listed in the instructions for use").

**Comparison-specific cautions:**
- **Noise.** Only 21 values; 52 unknown. Every value is a manufacturer claim with unstated measurement conditions, and comparators differ (`eq`, `<`, `≤`). Rank noise only between products that both have a value, and say it is indicative.
- **Weight.** Scopes differ (motor, per-cup, single-wearable-unit, unspecified). Compare only within the same scope.
- **Suction.** 300 mmHg figures are not like-for-like (Stride: single-cup setup; ranges vs maxima).
- **Dishwasher.** `parts: all` is "all parts the source calls parts", never the device.

Gaps were not filled. All counts above are from catalog statuses only.

---

## 6. Grounding evaluation

**No Claude integration exists** (no Anthropic SDK or API call anywhere in `app/`, `lib/`, `components/`). Everything below evaluates the **payload** produced by `lib/grounding.ts`. **Claude's actual behaviour has not been tested.**

### What `buildGroundingContext` supplies

| Section | Contents |
|---|---|
| `rules` | 7 rules |
| `products[]` | Brand, model, derived classification (basis, `usesInferred`), plus `verified[]` / `inferred[]` (with rationale) / `conflicting[]` / `unknown[]` (with notes). Every value carries citations: URL, publisher, `accessedOn`, quote, scope, section. |
| `offers[]` | Copied verbatim from provider quotes with provenance and the simulated label. `listPriceCents` and `insurancePaysCents` are deliberately **not** passed. |

### 30 adversarial cases, 54 payload checks: 43 pass, 11 fail

Each case is defined in the JSON (`grounding.cases[]`) with its question, product ids, programmatic payload checks, and the expected model behaviour for a future response test.

| Category | Cases | Payload result |
|---|---|---|
| Missing specs | G01 S1 vs S2 noise · G02 Willow Go vs M9 weight · G03 Evenflo Advanced vs Deluxe battery | Unknowns stay unknown; no dB or weight is invented. G03 fails: the payload doesn't say the two records are indistinguishable. |
| Conflicting claims | G04 Roam battery · G05 S9 Pro noise · G06 NaturalWave "5 oz/60 ml" · G07 Luna with Battery battery | All conflicts sit under `conflicting` with both candidates. G07 fails: the "4+ hours" candidate is encoded `up-to`. |
| Similar names / variants | G08 PIS Pro vs Pro+ ×2 · G09 Luna vs Luna with Battery · G10 eufy S2 vs S2 Pro · G11 Mya Joy vs PLUS | Records stay separate with no cross-quoting. G09 fails: `variantOf` is not in the payload. |
| Battery units | G12 S12 (min + sessions) vs Willow Go (sessions only) · G13 Stride "nearly 3 h" vs Duo · G14 Freestyle "about" | Units and comparators preserved in values. G12 and G13 fail: no rule forbids session→minute conversion or explains comparators. |
| Cleaning scope | G15 Freestyle cups-only · G16 PIS Pro `unspecified` · G17 Willow 360 `all` · G18 Thrive tubing exclusion | Exclusion quotes travel with values. G16 and G17 fail: there is no definition of `parts` scope. |
| Noise | G19 Elvie vs Willow Go (unknown) · G20 cross-brand dB ranking | Unknown preserved. G20 fails: no rule on cross-brand comparability. |
| Suction | G21 Stride vs V3 at 300 mmHg | Fails: the single-cup qualifier exists only inside the quote. |
| Hands-free / power / provenance / classification | G22 PIS Pro vs Duo hands-free · G23 S1 Plus plugged in? · G24 S2 Plus mains · G25 Zomee W1 brand-wide · G26 M6 unclassified · G27 Evenflo single-user? | Inferred stays inferred; brand-wide is flagged; unclassified is explicit. G23 fails: no list-completeness signal. G27 fails: the classification basis hides the multiUser assumption. |
| Insurance pricing | G28 "Is S2 Plus free with my insurance?" (no quotes) · G29 Scenario B $0 vs $75 · G30 unknown plan | All pass: no price data in product facts, offers labelled simulated, totals verbatim, `coverage_unverified` with no fallback. |

**Core property verified: the payload never turns unknowns, inferences, or conflicts into established facts.** Every attribute appears in exactly one status section. Inferred values are never in `verified`. Conflicts carry no chosen value. Unknowns carry no value. The 11 failures are cases where the payload is *correct but under-explained*: Claude would get no guidance it needs to avoid a plausible misstatement.

### Recommended rule and payload additions (not implemented)

1. **Comparators.** Preserve them (`lt` = "less than / nearly", `up-to`, `at-least`, `approximately`). Never state a qualified number as exact.
2. **Sessions vs minutes.** Never convert pumping sessions to minutes or the reverse.
3. **Dishwasher scope.** `parts: "unspecified"` / `"all"` refers to the parts the manufacturer names; never say the pump or motor is dishwasher safe.
4. **List completeness.** A list value names what the source states, not everything the product supports. Better: add a `complete: boolean` to list attributes.
5. **Noise.** dB figures are manufacturer claims with unstated conditions; comparisons are indicative.
6. **Variants.** Expose `variantOf` in `ProductFacts`.
7. **Classification basis.** Include `multiUser: "assumed-false"` in the basis when it is unknown.

### Executable future model-response tests

When a Claude integration exists:
1. For each case in `grounding.cases[]`, send the case's `question` with `buildGroundingContext({ productIds, quotes })`.
2. Assert the `expectedModelBehavior` list with a deterministic checker plus an LLM-graded rubric. Examples:
   - G07 response must not contain "at most 4 hours".
   - G16 must not say "the pump is dishwasher safe".
   - G29 must contain "simulated".
3. Run each case at least 5 times. Treat any single violation as a failure.

---

## 7. Regression results

| Command | Result |
|---|---|
| `npm test` | exit 0 · **263 passed**, 0 failed, 1,555 skipped. The skipped ones are the opt-in snapshot suite. Per file: semantics 191, catalog 14, grounding 8, scenarios 12, search 15, provider 15, suppliers 8. |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npm run build` | exit 0 (Next.js 16.4.3; `/`, `/_not-found` static) |
| Source snapshot verification (fresh live snapshots, `SOURCE_SNAPSHOTS=<live region dir>`) | **1,502 passed / 53 failed.** All 53 failures are Aeroflow supplier-listing checks; supplier pages were not fetched (out of scope). **0** product-quote failures, **0** unknown-with-signal failures, **73/73** source snapshots present. |

**Scenarios (independently re-run outside the test suite):**

| Scenario | Expected | Observed |
|---|---|---|
| **A** | 8 qualifying $0 offers from 6 suppliers | `free_offers_found`, 8 offers, 6 suppliers (PIS Pro ×4, S2 Plus ×4) ✓ |
| **B** | PIS Pro: $0 at Bloom (5 days), $75 at MamaMend (4 days), both free shipping; $0 first; $75 never in free search | Bloom `fully-covered`, total 0, shipping 0, 5 days, in free results. MamaMend `upgrade`, total 7500, shipping 0, 4 days, **not** in free results ✓ |
| **H** | Coastal Care / S2 Plus qualifying $0; checkout scripted as timeout → `pending-reconciliation`, idempotency key required | Quote `fully-covered`, total 0, qualifies; script data intact ✓. The timeout *behaviour* is Milestone 4 and not executable yet. |

**Free-only rule.** I checked all 92 offers returned by `findFreeOffers` across 4 plans × 6 category filters. Every one has status `fully-covered`, `inStock === true`, and pump, shipping, other-mandatory, and total charges all known and exactly 0. I then mutated each of the four charges to `null` and to `1`, set `inStock` to `null`, and set status to `upgrade` / `unverified`. Every mutation was rejected. Unknown plan and verification failure both return `coverage_unverified` with no offers.

**Simulated labelling.** 188/188 simulated quotes (4 plans × 47 offerings) carry `provenance.kind = "simulated"` and the label "Simulated demo data — not real insurance coverage, pricing, or inventory." Grounding passes the label through verbatim (G29).

---

## 8. Remaining risks

1. **Power-mode completeness (high).** One confirmed wrong value (Sonata) plus unflagged incompleteness across 43 battery-only lists. A user who needs to pump plugged in could be steered wrongly.
2. **Evidence strength behind classifications (medium).** 11 wearable classifications rest on product names; 55 electric classifications assume single-user from an unknown. Coverage logic in Milestone 2 depends on both.
3. **Values that are accurate but under-scoped (medium).** Dishwasher `all`/`unspecified`, Thrive capacity, Stride suction, Roam cleaning. Quote-level automation cannot catch these. They need either schema fields (component scope, condition) or human review.
4. **Sparse comparison data (medium).** Noise 28 %, weight 32 %, battery runtime 30 % (minutes) / 27 % (sessions), dishwasher 32 %. 14 products are near-empty. Manuals, the obvious next source, were not consulted.
5. **Grounding guidance gaps (medium).** The payload is honest about status, but Claude gets no rules for comparators, units, scope, list completeness, or noise comparability. Model behaviour is untested.
6. **Source freshness (low, time-dependent).** All sources were read 2026-10-28; the live check 13–14 days later found no drift. Manufacturer copy changes (Symphony PLUS gained body text). Re-run snapshot verification before each release.
7. **Automated-check blind spots (low).** No weight signal in the unknown-with-signal check. Composite string values are not compared against their quotes. Product regions include commerce text.
8. **Unresolved conflicts (low).** All 8 conflicts remain open: 7 genuine, 1 questionable (N-08). Manufacturer manuals or direct confirmation are needed.

---

## 9. Final verdict

### **READY WITH LIMITATIONS**

**Why not NOT READY.**
- Source authenticity, quotation accuracy, and freshness are excellent: 73/73 pages live and 0 drift.
- The status model (verified / inferred / conflicting / unknown) is applied consistently and preserved end-to-end into grounding.
- The free-only rule and simulated labelling are sound.
- 36 of 40 independently audited attributes pass, including all 10 previously problematic ones.

**Why not READY.**
- 3 FAIL-level catalog errors survived every automated check (N-01 Sonata power, N-04 Pro+ Traditional weight, N-05 BabyBuddha modes).
- 5 of 11 prior findings are only partially resolved.
- Comparison coverage is thin for weight, noise, battery runtime, and dishwasher safety.
- The grounding rules lack guidance Claude needs for qualified, scoped, or list-valued facts.

**Limitations Milestone 2 must respect (if approved to proceed):**
1. Do not rank or recommend on noise, weight, battery runtime, or dishwasher safety unless both products have a known value in the same unit, scope, and comparator class.
2. Treat the 14 insufficient-coverage products as "limited information" in any comparison UI.
3. Do not present `powerSources` lists as exhaustive.
4. Disclose that pump category is a PumpPath classification, and flag name-only wearable classifications and the single-user assumption until they are fixed.
5. Keep every offer labelled simulated.

**Recommended before or at the start of Milestone 2 (each needs approval; none was applied):**
1. Fix N-01, N-04, N-05.
2. Add list completeness and component-scope fields, or at minimum grounding rules 1–7 above.
3. Strengthen the 11 name-only wearable `collection` values from body copy where it exists.
4. Make classification disclose the `multiUser` assumption.
5. Add a weight pattern to the unknown-with-signal check.
6. Fix DATA.md inconsistencies (N-14).

*Stopping here as instructed. Milestone 2 has not been started; awaiting approval.*
