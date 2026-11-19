# PumpPath Research — Final Report

**Prepared:** 2026-11-11, final revision 2026-11-12 (after an external consistency review). **The catalog was not modified and no application code was written.**

**Hand these three files to Claude Code**
- `PUMPPATH_RESEARCH_FINAL.csv` — 828 rows. Self-contained: every proposed update, new attribute, confirmation, maintainer note, and every attribute deliberately left out of scope or kept without a re-check.
- `PUMPPATH_CONSUMER_RATINGS.csv` — 74 rows: noise and cleaning ratings with counts, sources, caveats and confidence.
- This report.

All counts in this report are computed from those two files.

## 1. Baseline

- `irinatag/pump-shopping-agent`, branch `main` @ `ae50454`, schema `pumppath.catalog-export/v1`, retrieved 2026-11-11 21:16 UTC. Re-checked at the end of the project: `main` is still at `ae50454`, so **no catalog record changed during the research**.
- The branch `catalog-data-quality-remediation` (@ `4e92b24`) was not read. Anything it already fixes may duplicate rows here.
- All 74 products (12 brands) are covered. Every product ID comes from the export; none was invented.
- The three errors reported before the project (Sonata power sources, Pro+ Traditional weight, BabyBuddha 3.0 modes) are already correct in the baseline.

## 2. Rules used in this research

Every rule below was set or approved by the owner (Anna). They are listed so a later reader, human or model, can reproduce or challenge any row.

### R1. Manufacturer conflicts (the "rule-resolved" rows)

When two manufacturer sources give different values for the same attribute of the same product:
1. **Weight of evidence first.** Keep the value with more independent manufacturer statements behind it. A manual or technical specification outranks marketing copy on a product page.
2. **Conservative value only on a tie.** If the evidence is even, keep the value that promises the shopper less: shorter battery life, louder noise, heavier weight, lower suction.
3. **Never silent.** The losing value is always kept on the row.

How these rows are encoded in `PUMPPATH_RESEARCH_FINAL.csv`:
- `action` = "Update (conflict resolved by owner rule; both values kept in limitations)".
- `proposedStatus` = `inferred`, never `verified`, because the manufacturer has not resolved the conflict.
- `proposedValue` = the kept value, followed by "; note" and the other value.
- `ruleBasis` = "Weight of evidence" or "Tie; conservative value kept".
- `limitations` explains the sources on each side.

There are 8 such rows:

| Product | Attribute | Kept value | Other value | Basis |
|---|---|---|---|---|
| `ameda-mya-joy-plus` | batteryLife | Up to 180 minutes (3 hours) | Ameda's guide says about 120 minutes | Weight of evidence |
| `medela-sonata` | batteryLife | Up to 1 hour | the feature copy says 1.5 hours | Weight of evidence |
| `medela-sonata` | weight | 1.1 kg (about 2.4 lb), pump only | the page says 2.2 lb | Weight of evidence |
| `momcozy-m6-mobile-style` | maxSuction | Up to 295 mmHg | the specification block gives a band of -285 to -300 | Weight of evidence |
| `momcozy-s9-pro` | noise | 50 dB | the specification block says under 45 dB | Tie; conservative value kept |
| `motif-luna-with-battery` | batteryLife | Over 2 hours (lower bound) | newer page copy says 4+ hours | Weight of evidence |
| `motif-roam` | batteryLife | Approximately 120 minutes | the description says up to 90 | Weight of evidence |
| `spectra-9-plus` | weight | 290 g (about 0.64 lb) | the product page says 0.5 lb | Weight of evidence |

A ninth conflict, `zomee-mothers-nature-h1` power source, was closed by evidence (the page gives a charging time, so the pump has a rechargeable battery) and is an ordinary inferred update. `zomee-fit` also carries a noted, unresolved contradiction about whether silicone diaphragms may go in the dishwasher; the row records both statements.

### R2. Sources and trust levels

- **Manufacturer facts** come only from manufacturer product pages, support articles and manuals. Priority: manuals, then specifications, then product pages, then FAQs.
- **Owner-verified facts:** where research found nothing, the owner (Anna) supplied the value and is the source of truth for it. By the owner's decision these are **verified** facts: `evidenceClass` = "Owner-verified fact", `proposedStatus` = `verified`, `confidence` = "Owner-verified". The provenance stays visible so the row can be told apart from a manufacturer-sourced one; the researcher did not independently check these sources.
- **Retailer or supplier listings found by the researcher** (not supplied by the owner) are allowed for weight only, labelled as such, `inferred`, Low confidence. Retailer "item weight" fields were rejected where they were boxed-product weights.
- **Derived values** (portability class, hands-free, "not applicable" battery fields, single pumping for manual pumps) are computed from facts already in the catalog and marked "Derived from catalog facts", `inferred`.
- **Consumer reviews** are used only for the two subjective ratings in R5, never for facts.

### R3. Scope

- **In scope:** power source, collection type, weight for every pump, battery per charge, capacity for wearables, dishwasher safety, cleaning restrictions, single or multi-user where it was unresolved.
- **Out of scope by owner decision** (`action` = "Out of scope (owner decision)"): max suction, suction levels, included items, features, capacity for traditional pumps, and research on single or double pumping. These are not missing data.
- **Kept without a re-check** (`action` = "Catalog value kept, not re-checked (owner decision)"): existing catalog values that were on the list to double-check and that the owner decided not to re-verify. The value stands and is usable.

### R4. Field conventions

- **Battery per charge:** battery life and battery sessions answer one question. Where the manufacturer states both, both are kept. Where only one is known, the missing one is out of scope and is not a gap.
- **Replaceable batteries:** pumps that run on AA batteries or an external battery pack get "Not applicable (runs on replaceable batteries)" for both battery fields. The app should show that in place of a runtime.
- **Weight scope:** the weight is recorded as the source publishes it, with what it covers (per cup, pair, motor unit, cup only, full set, assembled pump, pump with accessories). Nothing was doubled or halved. Display totals belong in the app.
- **Portability class:** Portable if the pump runs on any battery or is manual; Stationary if it runs on mains only. This is a new field, separate from the catalog's portability trait list.
- **Hands-free:** true for in-bra collection, false for traditional flanges and bottles.
- **Dishwasher safety:** "Dishwasher-safe parts" means the manufacturer allows the dishwasher for at least some parts; the detail says which. "Hand-wash only" means the manufacturer either forbids the dishwasher or says it has not verified it; the detail says which.
- **Rack and cycle are separate.** `cleaningRestrictions.topRackOnly` is proposed only when the manufacturer states a rack. A cycle rule goes in `cleaningRestrictions.cycleRestriction`.

### R5. Consumer rating rules

- **Evidence:** keyword counts of review mentions on the manufacturers' own product pages (about 19,000 reviews), plus owner-verified Gemini search results for 10 pumps.
- **A pump is rated on any number of mentions,** even one. "No reviews found" and "reviews read, none mention it" are recorded as such.
- **Noise:** the level (Quiet, Moderate, Noticeable) with more than half the mentions wins. With no majority, an even split between neighbouring levels takes the louder one; otherwise moderate and loud mentions count together against quiet, and if they outnumber quiet the pump is Noticeable. Manual pumps are "Not applicable".
- **A Quiet rating is kept even when many mentions disagree.** 15 Quiet pumps have 30% or more contrary mentions; they stay Quiet by the majority rule.
- **Cleaning:** "Requires more effort" when 25% or more of cleaning mentions are complaints; otherwise "Easy to clean". With no review mentions, a manufacturer design description may set the rating; `cleaningRatingSource` says which applies.
- **Confidence:** Very low for two or fewer mentions; otherwise Low. Nothing is rated above Low, because the reviews are manufacturer-hosted.

### R6. Quotes

- `keyQuote` holds at most 14 words. `quoteStatus` says where it comes from: captured during research, taken from the evidence already stored in the catalog, or absent.
- **No quotation was invented.** Where no verbatim quote was captured, the value was read from the cited source and is paraphrased in `evidenceSummary`. The owner accepted these rows as usable.

## 3. What the final CSV contains

| `action` | Rows | What Claude Code should do |
|---|---|---|
| Update | 302 | Apply the value with its `proposedStatus`. |
| Update (conflict resolved by owner rule; both values kept in limitations) | 8 | Apply as `inferred`; keep the note. |
| Add new attribute | 172 | Needs the schema fields in section 5. |
| Confirm (no value change) | 50 | Evidence upgrade only. |
| Note for maintainers (not an attribute update) | 8 | Do not write to a field. These explain model identity and kit variants. |
| Catalog value kept, not re-checked (owner decision) | 86 | Leave untouched. |
| Out of scope (owner decision) | 202 | Leave untouched; not missing data. |
| Keep as is (unresolved) | 0 | None remain. |

**Evidence behind the 482 updates and additions**

| `evidenceClass` | Rows |
|---|---|
| Manufacturer fact | 277 |
| Derived from catalog facts | 142 |
| Owner-verified fact | 54 |
| Retailer or supplier listing | 9 |

**Status and quotes.** 351 rows are proposed as `verified`. Of those, 116 carry a quote captured in research, 79 carry the catalog's existing evidence quote, and 100 have no verbatim quote (see R6).

**Updates by attribute**

| Attribute | Rows |
|---|---|
| weight | 51 |
| dishwasherSafe | 50 |
| batteryLife | 45 |
| batterySessions | 31 |
| powerSources | 31 |
| handsFree | 28 |
| multiUser | 24 |
| pumping | 14 |
| capacity | 14 |
| collection | 8 |
| includedItems | 4 |
| closedSystem | 3 |
| suctionLevels | 3 |
| maxSuction | 2 |
| cleaning | 1 |
| noise | 1 |

## 4. Open research tasks and documented uncertainty

**There are no outstanding research tasks within the agreed scope.** That is not the same as no remaining uncertainty. The following are recorded on purpose and need no further research:
- `zomee-fit`: Zomee contradicts itself on whether silicone diaphragms may go in the dishwasher. Both statements are on the row.
- `zomee-mothers-nature-h1`: the battery is established; whether it pumps while plugged in is not stated anywhere.
- Eight weights are recorded without a stated component scope (one cup, pair, motor or box).
- 9 noise ratings and 15 cleaning ratings are Unknown because the reviews are absent or silent.
- Eight manufacturer conflicts are settled by rule R1, not by the manufacturer.

## 5. New attributes

| New attribute | Rows |
|---|---|
| `portabilityClass` | 57 |
| `partsToClean` | 32 |
| `cleaningRestrictions.topRackOnly` | 29 |
| `cleaningRestrictions.notWashable` | 25 |
| `cleaningRestrictions.handWashRecommended` | 22 |
| `cleaningRestrictions.cycleRestriction` | 7 |

Also needed: a consumer-rating object (rating, confidence, counts, rating source, review-set caveats), weight scope values beyond `motor`, and a provenance value for owner-verified facts.

## 6. Consumer ratings

| Noise | Products | | Cleaning | Products | | Dishwasher (manufacturer fact) | Products |
|---|---|---|---|---|---|---|---|
| Quiet | 47 | | Easy to clean | 50 | | Dishwasher-safe parts | 57 |
| Moderate | 1 | | Requires more effort | 9 | | Hand-wash only | 17 |
| Noticeable | 6 | | Unknown | 15 | | Unknown | 0 |
| Not applicable (manual) | 11 | | | | | | |
| Unknown | 9 | | | | | | |

- **Moderate or Noticeable:** `medela-pump-in-style-hands-free`, `motif-duo`, `lansinoh-wearable`, `zomee-fit`, `babybuddha-3`, `babybuddha-wearable`, `evenflo-advanced-single-electric`.
- **Requires more effort:** `medela-sonata`, `medela-melody-inbra`, `lansinoh-smartpump-3`, `willow-360`, `willow-sync`, `willow-silicone-wearable`, `ameda-mya-joy`, `babybuddha-wearable`, `eufy-s2-pro`.
- **Quiet with 30% or more contrary mentions (15):** `medela-pump-in-style-pro`, `medela-freestyle-hands-free`, `medela-swing-maxi-hands-free`, `medela-symphony-plus`, `spectra-synergy-gold`, `spectra-premier-wearable`, `lansinoh-discreetduo-flow`, `lansinoh-thrive-2-in-1`, `lansinoh-signature-comfort`, `momcozy-air-1`, `momcozy-s9-pro`, `momcozy-wellness-1`, `momcozy-s12-pro-quick`, `willow-360`, `willow-sync`.
- **Unknown ratings** are pumps whose page has no reviews or whose reviews do not mention the topic. They are not research gaps.
- **Rating source:** 58 cleaning ratings come from review mentions; `motif-manual-silicone` comes from the manufacturer's design description alone.
- **Review-set caveats** (`reviewSetCaveats`): 8 pumps: includes reviews syndicated from other retailers; 6 pumps: capped at the 1,200 most recent reviews; 5 pumps: includes reviews of an earlier model or store; 2 pumps: review set shared with another catalog product.
- **Hand-checked counts** (`countsHandChecked`): `medela-sonata` and `lansinoh-smartpump-3` were read hit by hit. `momcozy-m9-mobile-flow` has known false "hard" matches that can only lower its complaint share, so its rating is not sensitive to them. All other counts are unchecked keyword counts.

## 7. Limitations and weakest values

- **Owner-verified facts:** 54 update or addition rows, including 26 weights, rest on the owner's verification and were not independently checked by the researcher.
- **Eight weights have no stated scope** (Very low confidence): the retailer does not say whether the figure is one cup, the pair, the motor or the box.
- **Three weights are whole-product figures,** not motor weights: `babybuddha-3`, `evenflo-pocket-double-electric`, `lansinoh-signature-comfort`. Do not rank them against motor-only weights.
- **Third-party battery figures:** `spectra-s3-pro` (a blog) and `zomee-mothers-nature-h1` (retailers).
- **OCR:** Spectra manuals are image-only. Values read from them (`spectra-premier-wearable` weight and dishwasher detail, `spectra-9-plus` weight and battery, `spectra-synergy-gold-portable` battery, `spectra-s1-plus` battery) depend on OCR.
- **Inferred dishwasher values (6):** `evenflo-advanced-manual`, `evenflo-advanced-single-electric`, `spectra-premier-wearable`, `zomee-fit`, `zomee-mothers-nature-h1`, `zomee-mothers-nature-w1`. Two Evenflo pumps rest on a sister model's manual, three Zomee pumps on a brand-wide care page on a regional Zomee site, one Spectra on OCR of an image-only manual. The two owner-verified dishwasher values (`babybuddha-wearable`, `lansinoh-naturalwave`) are `verified`.
- **`zomee-mothers-nature-h1` power:** the battery is established; pumping while plugged in is not.
- **Manufacturer-hosted reviews skew positive** and were counted by keyword.
- **Not covered at all:** insurance pricing, supplier eligibility and availability. None was researched and none was invented.

## 8. Instructions for Claude Code

1. Read `PUMPPATH_RESEARCH_FINAL.csv` by the `action` column, as in the table in section 3.
2. Carry `evidenceClass` and `proposedStatus` into the catalog exactly as given. **Owner-verified facts are imported as `verified`**, with owner provenance. Derived values, researcher-found retailer listings and rule-resolved conflicts are imported as `inferred`.
3. Add the schema fields in section 5 before importing.
4. Show consumer ratings separately from manufacturer facts, with their confidence and caveats.
5. Compute display weight in the app from the stored value and its scope.
6. Compare against `catalog-data-quality-remediation` before applying.
7. Re-run the catalog trust audit after import.

## 9. Package integrity

`PUMPPATH_PACKAGE_MANIFEST.json` records, for this exact package: the generation time, the baseline commit, the SHA-256 of each CSV, and the row counts by `action`, `proposedStatus`, `evidenceClass` and rating. This report and the manifest are written by the same script from the same two CSVs in one run.

To check that a copy of the package is in sync: recompute the SHA-256 of each CSV and compare it with the manifest (7614b1153138… and 1ed8bf475ae2…), then compare the counts in section 3 with `byAction`. If a CSV is edited later, the hashes will no longer match and this report must be regenerated, not hand-edited.

## 10. Corrections made after the external review (2026-11-12)

- **Owner policy applied:** facts supplied by the owner are now `verified` with `evidenceClass` "Owner-verified fact". Earlier drafts marked them unverified and inferred.
- "None unresolved" was reworded: there are no open research tasks, and the remaining documented uncertainty is listed in section 4.
- The ratings file's `evidenceOrigin` and `ratingRules` columns now agree with the newer columns and with rule R5; the battery rule in R4 was reworded.

- Report counts are now generated from the CSVs. Earlier drafts said 328 confirmed rows (the CSV had 296) and seven rule-resolved conflicts in one place (there were six at the time).
- Blank quotes on verified rows were filled from evidence already in hand; `quoteStatus` was added.
- Rack position and cycle restriction were separated for seven Spectra pumps.
- `zomee-mothers-nature-h1` power was downgraded from verified to inferred.
- Three partial suction-level rows (`zomee-fit`, `spectra-s1-plus`, `spectra-9-plus`) were removed; a mode or massage-level count is not a suction-level count.
- Replaceable-battery pumps now share one wording.
- Cleaning-restriction rows for `lansinoh-naturalwave` carry the same owner-verified status as the dishwasher value they come from.
- `cleaningRatingSource`, `noiseRatingSource`, `reviewSetCaveats` and `countsHandChecked` were added to the ratings file.
- Rows were added for two conflicts that had been mentioned only in prose (`ameda-mya-joy-plus` battery, `spectra-9-plus` weight).
- Eight identity notes were relabelled so they are not treated as attribute updates.
