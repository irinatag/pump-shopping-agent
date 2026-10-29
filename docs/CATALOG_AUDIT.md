# PumpPath Catalog Audit — Milestone 1.5

**Audit date:** 2026-10-28 · **Scope:** `lib/products/` (74 records, 73 sources) · **Type:** read-only audit; no catalog, engine, provider, or test changes were made.

## Method

1. Selected 20 verified attributes from 12 models across 9 brands, weighted toward numeric specs, variants, classifications, and interpretive (high-risk) records; plus 3 of the 8 recorded conflicts.
2. **Re-fetched the live US manufacturer page** for every sampled record (15 pages, robots.txt honored, 5-second spacing) into a fresh directory, independent of the extraction snapshots.
3. For each record, located the stored quote on the live page and read the surrounding lines to judge product/variant match, units, qualifiers ("up to", "less than", "nearly"), and whether the quote actually supports the stored value — not merely whether it matches.
4. Inspected all 74 records with a temporary read-only script (deleted afterwards) for duplicates, source references, classification evidence, borrowed evidence, weak evidence, and commerce leakage, then spot-checked suspicious cases against saved pages.

**Limitation:** the live re-fetch happened on the same day as extraction, so it independently tests *interpretation* but cannot detect page drift. All 15 live pages were accessible and all 25 sampled quotes were still present verbatim.

**Status definitions:** **PASS** — live source supports the stored value as recorded. **NEEDS REVIEW** — quote is real but the value rests on an inference, an unstated scope, or a definition PumpPath has not documented. **FAIL** — the stored value or note is contradicted by the source.

## Results at a glance

| Set | PASS | NEEDS REVIEW | FAIL |
|---|---|---|---|
| 20 sampled verified attributes | 13 | 7 | 0 |
| 3 sampled conflicts (handling) | 3 | 0 | 0 |
| Catalog-wide integrity findings (not part of the sample) | — | 9 | 4 |

No sampled verified value was contradicted by its live source. The material problems are in **classification evidence** and in **values recorded as unknown that the source actually states** — both traced to the extraction process (see *Recurring problems*).

## Task 2 — Sampled verified attributes

All sources: publisher's US manufacturer page, accessed 2026-10-28, re-checked live 2026-10-28.

| # | Brand / model | Product ID | Attribute | Stored value | Source URL | Publisher | Supporting quotation | Accessed | Live source | Interpretation notes | Audit |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S01 | Medela Pump In Style Pro | `medela-pump-in-style-pro` | weight | 560 g, eq, scope pump | https://www.medela.com/en-us/breastfeeding-pumping/products/pumps/classic-electric/pump-in-style-pro-double-electric-breast-pump | Medela | "Pump weight: 1.23 lbs. / 560 g" | 2026-10-28 | Accessible | Line is in the product's own "What's included" block. 1.23 lb ≈ 558 g; stored the source's metric figure, not a conversion. | **PASS** |
| S02 | Medela Pump In Style Pro | `medela-pump-in-style-pro` | handsFree | false | same | Medela | "If you would like to pump hands-free, you can purchase Medela Hands-free collection cups separately." | 2026-10-28 | Accessible | Quote says hands-free is *possible* with separately sold cups. `false` encodes "not hands-free as sold", a rule that is not documented and is applied inconsistently (Sonata, Luna, H1, Signature Comfort with similar wording are `unknown`). | **NEEDS REVIEW** |
| S03 | Medela Pump In Style Pro | `medela-pump-in-style-pro` | closedSystem | true | same | Medela | "designed with a milk barrier that is placed at the collection cup breast shield to keep milk from passing into the tubing" | 2026-10-28 | Accessible | Answer to the FAQ "Is the NEW Pump In Style Pro a closed-system pump?" describes a milk barrier but never says "yes". Medela defines a milk barrier as a closed system on another page (Magic InBra). Likely correct, but it is an inference. | **NEEDS REVIEW** |
| S04 | Medela Pump In Style Pro | `medela-pump-in-style-pro` | includedItems | 6 items (pump; 2×21 mm and 2×24 mm PersonalFit Plus shields; 2 bottles & lids; 2 connectors with membranes; A/C adaptor) | same | Medela | "1 x Pump In Style Pro breast pump" … "1 x A/C power adaptor" (each item verbatim) | 2026-10-28 | Accessible | Live list matches all six items exactly; box dimensions/weight/warranty lines correctly excluded. | **PASS** |
| S05 | Spectra S2 Plus | `spectra-s2-plus` | maxSuction | 270 mmHg, up-to | https://www.spectrababyusa.com/products/spectra-s2-plus-premier-double-electric-breast-pump | Spectra Baby USA | "Up to 270mmHg hospital strength suction." | 2026-10-28 | Accessible | "Up to" qualifier preserved. US page (270) rather than Spectra Australia's 320 figure — correct market match. | **PASS** |
| S06 | Spectra S2 Plus | `spectra-s2-plus` | power | ["ac-adapter"] only | same | Spectra Baby USA | "One (1) Spectra 12V AC Power Adapter/Charger" | 2026-10-28 | Accessible | Supports that an adapter is included. A single-item list reads as "AC only / no battery", which the page never states. Probably true for the S2 Plus but unsupported as a negative. | **NEEDS REVIEW** |
| S07 | Spectra Synergy Gold | `spectra-synergy-gold` | closedSystem | true | https://www.spectrababyusa.com/products/spectra-sg-synergy-gold-double-adjustable-electric-breast-pump | Spectra Baby USA | "Backflow protection to prevent contamination" | 2026-10-28 | Accessible | Quote is from the SG's own feature list but describes backflow protection, not a closed-system claim. The page's explicit "Closed System — Prevents backflow into tubing or pump." block sits under copy that names the **SG Portable**, so it cannot be attributed to this model. | **NEEDS REVIEW** |
| S08 | Spectra Synergy Gold | `spectra-synergy-gold` | category | traditional-electric | same | Spectra Baby USA | "Synergy Gold® Double Adjustable Electric Breast Pump" | 2026-10-28 | Accessible | Product title supports "double electric" only. "Traditional" (vs portable) is PumpPath's judgment, inferred partly because a separate SG Portable exists. | **NEEDS REVIEW** |
| S09 | Motif Luna (non-battery) | `motif-luna` | noise | <39 dB | https://motifmedical.com/motif-luna-breast-pump | Motif Medical | "Motif Luna® - A quiet <39-decibel hum" | 2026-10-28 | Accessible | Correct variant: the next line gives "<40" for "Motif Luna® with Battery", stored on the variant record. The page also says generically "The Luna operates at an ultra-quiet <40 dB"; this is consistent (<39 is also <40). | **PASS** |
| S10 | Motif Duo | `motif-duo` | batteryLife | 150 min, eq | https://motifmedical.com/duo-portable-breast-pump | Motif Medical | "100% portable. The rechargeable battery lasts 2.5 hours" | 2026-10-28 | Accessible | 2.5 h = 150 min, exact. Same figure repeated in the product description. | **PASS** |
| S11 | Motif Duo | `motif-duo` | handsFree | true | same | Motif Medical | "The Motif Duo comes with a complimentary Hands-Free Pumping Bra" | 2026-10-28 | Accessible | Bra is included in the box ("1 - One Size Fits Most Hands-Free Pumping Bra"); hands-free as sold. | **PASS** |
| S12 | Momcozy M5 Smart | `momcozy-m5-smart` | maxSuction | 285 mmHg, eq | https://momcozy.com/products/m5-smart-wearable-breast-pump-upgraded-with-app-control | Momcozy | "Suction Power: 285 mmHg" | 2026-10-28 | Accessible | Spec block states 285; feature copy says "up to -285 mmHg". Same maximum; comparator `eq` vs `up-to` is a minor qualifier difference. | **PASS** |
| S13 | Momcozy M5 Smart | `momcozy-m5-smart` | weight | 230 g, eq, scope per-unit | same | Momcozy | "Weight: 230 g" | 2026-10-28 | Accessible | Number and unit match. The source does not say whether 230 g is one pump or the pair; `per-unit` scope was assigned without source wording. | **NEEDS REVIEW** |
| S14 | Momcozy V3 | `momcozy-v3` | handsFree | true | https://momcozy.com/products/v3-double-electric-breast-pump | Momcozy | "3-part wearable collectors simplify setup and cleanup" | 2026-10-28 | Accessible | Page also headlines "Truly Hands-Free" and "Hands-Free Freedom"; wearable collectors are included. Supported. (Its *category* — traditional-electric — is questioned in integrity finding I-07.) | **PASS** |
| S15 | Lansinoh Wearable Pump | `lansinoh-wearable` | capacity | 8 oz, eq | https://lansinoh.com/products/wearable-breast-pump | Lansinoh | "8oz click-tight cups holds more milk than other wearable pumps" | 2026-10-28 | Accessible | Consistent with the box list "2 wearable pumping cups (8oz)". | **PASS** |
| S16 | Lansinoh Wearable Pump | `lansinoh-wearable` | dishwasherSafe | true | same | Lansinoh | "Stress-free cleaning and assembly with no tiny parts, top rack dishwasher safe" | 2026-10-28 | Accessible | Supported; the "top rack" qualifier is not representable in a boolean but is preserved in the quote. | **PASS** |
| S17 | Willow 360 | `willow-360` | category | wearable | https://onewillow.com/products/willow-pump-360 | Willow | "Totally in-bra with a shape that mimics the breast for discretion (no external motor, clips, or cords)" | 2026-10-28 | Accessible | Explicit self-contained in-bra design; exactly the catalog's wearable definition. | **PASS** |
| S18 | Elvie Stride | `elvie-stride` | batteryLife | 180 min, lt | https://onewillow.com/products/elvie-stride-hospital-grade-electric-breast-pump | Willow (Elvie) | "Rechargeable battery lasts for nearly three hours of pumping" | 2026-10-28 | Accessible | "Nearly three hours" → less than 180 min is faithful. Page title confirms original **Stride**, not Stride 2 (Stride 2 appears only in an FAQ). | **PASS** |
| S19 | Ameda Pearl | `ameda-pearl` | weight | 54 oz, eq, scope pump | https://www.ameda.com/products/ameda-pearl-hospital-grade-breast-pump | Ameda | "3lbs. 6oz" (under "Unit Weight:") | 2026-10-28 | Accessible | 3 lb 6 oz = 54 oz, exact; the only arithmetic normalization in the catalog, documented in DATA.md. | **PASS** |
| S20 | Zomee Fit | `zomee-fit` | closedSystem | true | https://zomee.com/products/zomee-z2-double-electric-breast-pump | Zomee | "All Zomee breast pumps, including the Z2, have a fully enclosed, anti-backflow system." | 2026-10-28 | Accessible | Evidence is a brand-wide claim on the **Z2** page, not the Fit page. The Fit's own page adds "Built-in anti-backflow system to help prevent leaks and protect milk". Together they support the value; cross-page provenance should be visible to users. | **PASS** |

## Sampled conflicts (audited separately)

| # | Brand / model | Product ID | Attribute | Recorded candidates | Live quotations (same page) | Live source | Notes | Audit of conflict handling |
|---|---|---|---|---|---|---|---|---|
| C1 | Motif Roam | `motif-roam` | batteryLife | up to 90 min · up to 120 min | "The rechargeable battery provides up to 90 minutes of pumping" (product description) · "Equipped with a battery life of up to 120 minutes" (feature tile) | Accessible — https://motifmedical.com/motif-roam | Both statements still live; genuine manufacturer contradiction. Resolvable only via the Roam user manual or Motif. | **PASS** |
| C2 | Lansinoh NaturalWave | `lansinoh-naturalwave` | capacity | 5 oz · 60 ml | "2 Lansinoh Bottles (5 oz/60 ml)" | Accessible — https://lansinoh.com/products/naturalwave-double-electric-breast-pump | One string, internally inconsistent (5 oz ≈ 148 ml). 60 ml is probably a typo, but correctly not guessed. | **PASS** |
| C3 | Zomee Fit | `zomee-fit` | capacity | 6 oz · 150 ml | "Larger 6 oz container (7 oz sold separately) for longer sessions" · "(2) 150ml Collection Containers" | Accessible — https://zomee.com/products/zomee-fit-wearable-hands-free-breast-pump | Still live. The page's fullness-sensor settings (4/5/6 oz) lean toward 6 oz, and the box list may be stale; still a conflict until confirmed. | **PASS** |

## Task 4 — Catalog-wide integrity (all 74 records)

| ID | Check | Finding | Status |
|---|---|---|---|
| I-01 | Duplicate models | No duplicate ids or brand+model names. Name overlaps are distinct products: Pump In Style Pro vs Pro+ Traditional vs Pro+ Hands-free; Mya Joy vs Mya Joy PLUS; eufy S2 vs S2 Pro. | PASS |
| I-02 | Variant consistency | One declared variant (Motif Luna with Battery → Luna); variant-specific noise and power differ correctly. Evenflo Advanced vs Deluxe Advanced share identical copy and are kept separate without a variant claim, as documented. | PASS |
| I-03 | IDs vs models | Every id matches its brand/model and its primary source URL. | PASS |
| I-04 | Source references | 73 sources, all referenced, all https on manufacturer hosts; every evidence item cites a declared source listed in the product's `sourceIds`. | PASS |
| I-05 | Commerce leakage | No price, shipping, stock, coverage, or insurance keys in any product record; no "$", "price", "insurance", or "covered" text in any stored value, quote, or note. | PASS |
| I-06 | **Lansinoh NaturalWave category** | Stored `traditional-electric`, but the quoted evidence is "built-in handle for effortless portability", and the page also says "built-in handle for portable pumping wherever you go" and "RECHARGEABLE BATTERY … for on-the-go use". The evidence contradicts the classification. | **FAIL** |
| I-07 | **Medela Sonata category** | Stored `traditional-electric` with evidence "Sonata® is our smart breast pump", which says nothing about form factor. The page describes a built-in handle and pumping on the go. | **FAIL** |
| I-08 | **Spectra S1 Plus / S2 Plus closedSystem** | Stored `unknown` with note "Only a customer review on the page describes it as closed." False: both pages (saved and live) state "Closed System / Prevents backflow into tubing or pump." in the product's own feature block. | **FAIL** (×2) |
| I-09 | Category from title only | 10 records' "traditional vs portable" category rests on a product title or generic copy rather than a stated form factor: Pump In Style Pro, Spectra S1 Plus, S2 Plus, Synergy Gold, Motif Luna (×2), Lansinoh Signature Comfort, Smartpump 3.0, Evenflo Advanced, Evenflo Deluxe Advanced. Category drives simulated coverage, so this matters. | NEEDS REVIEW |
| I-10 | Momcozy V3 category vs hands-free | Stored `traditional-electric` and `handsFree: true` with "wearable collectors" included; by the catalog's own definitions it may be `hands-free-electric`. | NEEDS REVIEW |
| I-11 | Borrowed evidence | Medela Symphony PLUS category comes from the Pump In Style Pro FAQ ("Symphony is our hospital multi-user pump"), which names Symphony, not Symphony PLUS; the PLUS page itself only carries this in site navigation text. Elvie Pump "tube-free" comes from the Elvie Stride page's comparison. Zomee Fit/W1 closed system relies on a Z2-page brand claim. | NEEDS REVIEW |
| I-12 | `handsFree` semantics | Undefined in the schema. `false` (Pump In Style Pro) vs `unknown` for equivalent wording elsewhere; wearable `true` values often rest on the product title alone (8 records). | NEEDS REVIEW |
| I-13 | `power: "ac-adapter"` semantics | 15 records list `ac-adapter` from "1 x power adaptor" / "Power Adapter" box lines. For rechargeable pumps this may be a charger, not corded operation; single-item lists imply "no battery" without support (S06). | NEEDS REVIEW |
| I-14 | Missed stated attributes (false unknowns) | Values stated on saved pages but recorded unknown: Willow 360 power ("Rechargeable battery that lasts up to 5 pumping sessions"); Zomee Fit cleaning ("Simplified assembly with only four washable parts"); plus I-08. Full extent unknown without re-extraction. | NEEDS REVIEW |
| I-15 | Inferred closed-system values | Pump In Style Pro (milk barrier, S03) and Synergy Gold (backflow protection, S07) are inferences; the SG page's explicit closed-system block is about the SG Portable. | NEEDS REVIEW |
| I-16 | Scope and qualifier normalization | Weight scope assigned without source wording (M5 Smart "per-unit", S13); `eq` vs `up-to` used inconsistently for "up to" suction (S12). Low impact but affects comparisons. | NEEDS REVIEW |

## Recurring extraction and interpretation problems

1. **Extraction tooling hid real spec lines.** The excerpt tool (a) dropped any line appearing on ≥50% of a brand's fetched pages as boilerplate, which removed shared spec lines like Spectra's "Closed System" (on 5 of 8 Spectra pages); and (b) capped each tag at 3 lines, which navigation lines often consumed first (Willow 360 battery, Zomee Fit cleaning). Both produce **false unknowns** — and in I-08, false explanatory notes. They did not produce false verified values in the sample.
2. **The verbatim-quote check proves presence, not support.** `verify-sources.test.ts` passed all 1,118 checks, yet the sample shows quotes that are real but only indirectly support the value (S03, S06, S07, S08). The automated check cannot assess context.
3. **Category is a PumpPath judgment, not a manufacturer statement.** Manufacturers rarely say "traditional" vs "portable"; titles were treated as evidence. Two records contradict their own evidence (I-06, I-07).
4. **Undefined attribute semantics** (`handsFree`, `power`, weight `scope`) lead to inconsistent encodings of similar source wording.
5. **Cross-page and cross-product evidence** is allowed silently (I-11); it is sometimes correct (Zomee brand claim) and sometimes a variant mismatch (Symphony vs Symphony PLUS).

## Recommended corrections, ranked by severity

These are recommendations only; nothing has been changed.

| Rank | Severity | Recommendation | Fixes |
|---|---|---|---|
| 1 | High | Fix the two category records that contradict their evidence: re-classify Lansinoh NaturalWave and Medela Sonata from their pages (both describe portability), or mark category unknown. | I-06, I-07 |
| 2 | High | Correct the false notes on Spectra S1 Plus and S2 Plus `closedSystem`, citing the explicit "Closed System — Prevents backflow into tubing or pump." line. | I-08 |
| 3 | High | Re-run extraction for all 73 pages without the 50% boilerplate filter and per-tag cap (restrict boilerplate removal to page header/footer regions), then diff against the catalog to find other false unknowns. | I-14, problem 1 |
| 4 | Medium | Write a category rubric in DATA.md (e.g. traditional = mains-capable tabletop/handled unit with bottles; portable = handheld/clip-on motor) and re-review the 10 title-only categories against it; consider separating a manufacturer-stated `type` from PumpPath's `classification`. | I-09, I-10, S08 |
| 5 | Medium | Re-source Medela Symphony PLUS category from the Symphony PLUS page or its manual; flag cross-page evidence explicitly (e.g. `evidenceScope: "brand-wide" \| "other-product"`) so the UI and Claude can disclose it. | I-11, S20 |
| 6 | Medium | Define `handsFree` ("hands-free as sold, without separately purchased accessories") and `power` ("modes the pump can operate in", distinguishing charger from corded use), then re-encode affected records. | I-12, I-13, S02, S06 |
| 7 | Low | Mark inferred values (milk barrier → closed system; backflow protection → closed system) as `inferred` with rationale, or set unknown. | I-15, S03, S07 |
| 8 | Low | Normalize "up to" consistently and record weight scope only when the source states it. | I-16, S12, S13 |
| 9 | Low | Extend the opt-in verifier to print each quote's surrounding lines, so a human sign-off step can catch context problems the substring check cannot. | Problem 2 |
| 10 | Low | Resolve the three sampled conflicts from manufacturer manuals (Roam battery, NaturalWave bottle, Fit container) — keep them conflicting until then. | C1–C3 |

## Pages re-checked live (2026-10-28)

All accessible (HTTP 200, robots.txt permitted):
Medela Pump In Style Pro · Spectra S2 Plus · Spectra Synergy Gold · Motif Luna · Motif Duo · Motif Roam · Momcozy M5 Smart · Momcozy V3 · Lansinoh Wearable · Lansinoh NaturalWave · Willow 360 · Elvie Stride (onewillow.com) · Ameda Pearl · Zomee Fit · Zomee Z2.
