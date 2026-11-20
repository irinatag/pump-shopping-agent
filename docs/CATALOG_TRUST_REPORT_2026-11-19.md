# PumpPath Catalog Trust Report — after the research package

**Audit date:** 2026-11-19 · **Catalog commit:** `e7669a0` (branch `catalog-data-quality-remediation`; research package 2026-11-12 applied in `a609c2d`, labels and grounding in `e7669a0`) · **Type:** audit only. No catalog, engine, provider, test or source-evidence file was changed.

**Previous audit:** [`CATALOG_TRUST_REPORT.md`](CATALOG_TRUST_REPORT.md) (2026-11-10/11, commit `23d0d89`). This report re-runs it against the catalog with the research package applied. **Machine-readable results:** [`CATALOG_TRUST_AUDIT_2026-11-19.json`](CATALOG_TRUST_AUDIT_2026-11-19.json) (schema `pumppath.catalog-trust-audit/v1`, same shape).

**Scope (owner decision, 2026-11-19).** Automated re-run. Research-package values are the catalog's working values (`docs/DATA.md`, working-values policy) and were **not** independently re-verified attribute by attribute. The previous audit's 40-attribute live sample was therefore not repeated. Research values are reported by label and confidence. Everything else was re-run: the live quote check (partial: 29 of 75 sources, see section 1), totals and coverage, the I-06–I-16 and N-01–N-16 re-grades, the grounding payload cases (plus six new ones for the research package), and regression.

---

## 1. Executive summary

**Verdict: READY WITH LIMITATIONS** (unchanged; the limitations are narrower).

The research package fixed all three FAIL-level errors of the previous audit, settled all 8 manufacturer conflicts by the owner's rule, and filled the largest coverage gaps. Weight, dishwasher safety, hands-free, collection and mechanism are now known for all 74 products. No product covers 3 or fewer of the 7 comparison dimensions; before, 31 did. Labels now tell Claude who stands behind each value. Owner-verified values are never presented as manufacturer statements, and rule-settled values carry the values they replaced.

What still limits trust: most new values were accepted without an independent check by design. 140 verified values have no verbatim quote (owner-verified facts and research paraphrases). The grounding rules still lack the guidance on comparators, units, dishwasher scope, list completeness and noise that the previous audit asked for: 9 of its payload checks still fail. Noise (22/74) and maximum suction (41/74) remain sparse. The live check covered only 29 of 75 sources (no drift on any of them): Lansinoh and Momcozy now refuse automated requests, and the run was stopped before the remaining brands were reached.

| Area | Result |
|---|---|
| Prior FAIL findings (N-01, N-04, N-05) | **3/3 RESOLVED** |
| Remediation (I-06 – I-16) | **8 RESOLVED, 3 PARTIALLY RESOLVED, 0 UNRESOLVED** (was 6 / 5 / 0) |
| Prior findings N-01 – N-16 | **4 RESOLVED · 9 PARTIALLY RESOLVED / MITIGATED · 3 OPEN** (none FAIL-level) |
| Live source check | **Partial: 29 of 75 sources fetched** (Medela 15 including 2 manuals, Spectra 8, Motif 6). On those, **504/504 quotes present, 0 drift**; 127/127 unknown-with-signal checks pass. 46 sources not checked live: Lansinoh (8) and 6 Momcozy pages refused automated requests (HTTP 429); the rest (Momcozy 4, Willow 5, Elvie 3, Ameda 6, Zomee 4, BabyBuddha 3, Evenflo 5, eufy 2) were not reached when the run was stopped by owner decision. Their last live check is 2026-11-11 (0 drift). |
| Conflicts | **0** open (8 settled by rule R1 as `inferred`, other values kept; 1 settled by evidence) |
| Comparison readiness | 17 products cover 7/7 dimensions, 28 cover 6, 27 cover 5, 2 cover 4, **0 cover ≤ 3** (was 31) |
| Grounding payload | Original 30 cases: **44/53 checks pass** (was 43/54; 9 failures are the same unaddressed guidance gaps). New research-package cases: **9/9 pass**. Claude's responses are still untested: there is no Claude integration. |
| Regression | test (310 passed), typecheck, lint, import `--check` exit 0; build exit 0 (after Next.js's advisory gate, see section 6). Offers unchanged; 188/188 simulated quotes labelled. |

---

## 2. Remediation status (I-06 – I-16)

| ID | Issue | Status 2026-11-11 | Status now | Evidence now |
|---|---|---|---|---|
| I-06 | NaturalWave category from portability | RESOLVED | **RESOLVED** | Still derived `flange-bottle-electric`. Its capacity conflict ("5 oz/60 ml") is settled: `inferred` 5 oz. |
| I-07 | Sonata category from "smart" | RESOLVED | **RESOLVED** | Category unchanged; the related power error (N-01) is fixed. |
| I-08 | S1/S2 Plus closedSystem | RESOLVED | **RESOLVED** | Unchanged. |
| I-09 | Categories from product titles | PARTIALLY | **PARTIALLY RESOLVED** | Of the 11 name-only wearables (N-03), 3 gained manufacturer research rows (Premier Wearable, Aura Glow, S9 Pro), 2 became owner-verified (Wellness 1, S12 Pro Quick) and Elvie Pump moved to `inferred`. 5 still rest on the name or "wearable" wording only: Melody, Motion, GLO, eufy S2, eufy S2 Pro. |
| I-10 | Momcozy V3 | RESOLVED | **RESOLVED** | Unchanged. |
| I-11 | Cross-page evidence | RESOLVED | **RESOLVED** | Zomee W1 closedSystem, whose only page evidence is brand-wide, is now `inferred` ("PumpPath interpretation"). |
| I-12 | Hands-free semantics | RESOLVED | **RESOLVED** | handsFree known for 74/74 (`no` added; Willow Wave `no` by owner decision). |
| I-13 | Charger vs mains | PARTIALLY | **PARTIALLY RESOLVED** | 19 pumps gained `mains` (8 from owner-verified rows, 11 from manufacturer rows; 3 Spectra values are `inferred`). `mains` is now defined as "can pump while plugged in". 29 lists are still `["built-in-battery"]` with no completeness flag (N-02). |
| I-14 | Hidden stated values | PARTIALLY | **RESOLVED** | N-04 fixed; weight known for 74/74, so the missing weight pattern in the unknown-with-signal check no longer hides a value. eufy S2 Pro battery is now 390 min (`inferred`). |
| I-15 | Closed-system inferences | PARTIALLY | **PARTIALLY RESOLVED** | W1 fixed. Still inconsistent: Momcozy V1 Pro is now `verified` (manufacturer research row) while V2 Pro stays `inferred` on equivalent wording (N-09). |
| I-16 | Weight scope / comparators | PARTIALLY | **RESOLVED for the kept values; see N-08** | Weight scopes extended (`assembled-pump`, `per-collector`, …) and compound weights kept. Luna with Battery's kept value is now `at-least` 120 min. The remaining qualifier losses are tracked under N-08. |

---

## 3. Catalog-wide integrity results

### Totals

| Measure | Now | 2026-11-11 |
|---|---|---|
| Product records | 74 (73 models + 1 variant) | 74 |
| Sources | 75 manufacturer sources (73 pages + 2 manuals) | 73 |
| Attributes per product | 25 (6 added: portabilityClass, partsToClean, topRackOnly, notWashable, handWashRecommended, cycleRestriction) | 19 |
| Attribute slots | 1,850 | 1,406 |
| **Verified** | **885** (47.8 %) | 618 (44.0 %) |
| **Inferred** | **206** (11.1 %) | 78 (5.5 %) |
| **Conflicting** | **0** | 8 |
| **Not applicable** | **48** (2.6 %) | — |
| **Unknown** | **711** (38.4 %) | 702 (49.9 %) |
| Derived classifications | flange-bottle-electric 24 · wearable 24 · hands-free-electric 11 · manual 11 · multi-user 4 · **unclassified 0** | … wearable 23 · unclassified 1 |
| Classification changes | Momcozy M6: unclassified → wearable (collection `in-bra-wearable` from the package) | — |
| Classifications resting on ≥ 1 inferred attribute | 39 | 40 |
| Consumer ratings (separate domain) | 74 products | — |
| Maintainer notes (not attributes) | 8 | — |

### Fact labels (Phase 4)

| Label | Attributes | Meaning |
|---|---|---|
| Manufacturer statement | 830 | Verified from manufacturer quotes or manufacturer research rows only |
| Verified by PumpPath, not a manufacturer statement | 55 | 54 owner-verified rows + the Willow Wave owner decision. 8 of these also have a manufacturer quote and are still labelled owner-verified |
| Rule-resolved | 8 | Manufacturer sources disagree; rule R1 kept one value; the others are passed with it |
| Retailer listing | 9 | Weights only, Low confidence: Motif Manual Silicone, Aura Glow, Smartpump 3.0, Willow Go, Mya Joy, Zomee Z2, Evenflo Advanced Double, Deluxe Advanced Double, Advanced Manual |
| Derived from catalog facts | 95 | e.g. portabilityClass, hands-free from collection |
| PumpPath interpretation | 94 | Other inferred values, with rationale |
| Not applicable | 48 | Battery fields of manual, plug-in-only and replaceable-battery pumps, with the reason |
| Not verified | 711 | Unknown |

### Evidence strength of the new values (reported, not re-verified)

- **140 verified values have no verbatim quote**: their only evidence is an owner-verified row or a research paraphrase (report rule R6). They are labelled correctly, but nothing in them can be checked against a saved page. 3 owner-verified weights cite no source at all (Lansinoh Signature Comfort, Ameda One-Hand Manual, eufy S2).
- **Research key quotes are not snapshot-checked** (decision D9). `verify-sources` covers page and manual quotes only.
- **OCR-dependent values:** Spectra manuals are image-only; Premier Wearable weight and dishwasher detail, 9 Plus weight and battery, SG Portable and S1 Plus battery come from OCR (research report §7).
- **Third-party battery figures:** Spectra S3 Pro (a blog) and Zomee H1 (retailers).

### Checks

| Check | Result | Notes |
|---|---|---|
| Real US manufacturer and model identity | PASS with notes | Maintainer notes now record the identity questions (Elvie Pump single/double; S9 Pro and M5 "upgraded" editions; Evenflo Deluxe = Advanced + bag). They are not passed to Claude. |
| Variant associations | PASS | Luna vs Luna with Battery still separate. `variantOf` still not in the grounding payload. |
| Duplicate or misleading records | NEEDS REVIEW | eufy S2 and S2 Pro now differ (power, weight, features, parts to clean). Evenflo Advanced vs Deluxe differ only in `multiUser`: Advanced is verified single-user from its manual, Deluxe is unknown, although the maintainer note says it is the same pump plus a bag (A-01). |
| Valid source references | PASS | Every source quote cites a declared source; every research row names its links with a site type; no unused sources. |
| No retail prices, insurance, stock or shipping in product records | PASS | No commerce keys in product records or grounding product facts. Rationales mention "retailer or insurance supplier" and "shipping weight" as wording only. |
| Consistent classification rules | PARTIAL | 0 unclassified. 5 name-only wearables remain (I-09). 44 records still have `multiUser` unknown (was 67), and 33 electric classifications still assume single-user without saying so (N-10). |
| Status model end to end | PASS | Every attribute appears in exactly one grounding section with a label. Inferred and rule-resolved values never reach `verified`; not-applicable is never shown as unknown. |
| Power semantics | NEEDS REVIEW | Sonata fixed. 29 battery-only lists have no completeness flag. Zomee H1 drops `mains`: its adapter may only be a charger. |
| Weight scope and numeric qualifiers | NEEDS REVIEW | Scopes faithful. Stride "single cup set up" and Thrive cup-only capacity are still lost. Luna with Battery's *alternative* "4+ hours" is still encoded `up-to` (N-08). |
| Cleaning and dishwasher claims limited to supported components | IMPROVED | Every dishwasher value now has a label (`dishwasher-safe-parts` / `hand-wash-only`) and a `detail` saying which parts. `partsToClean`, `notWashable`, `topRackOnly`, `handWashRecommended`, `cycleRestriction` carry exclusions separately (e.g. Roam `notWashable`: "motor; tubing (wipe only)"). 16 values still have `parts: unspecified`. |

### Findings

Prior findings, re-graded:

| ID | Sev. | Was | Now | Evidence now |
|---|---|---|---|---|
| N-01 | High | FAIL | **RESOLVED** | Sonata `powerSources` verified `[mains, built-in-battery]` from the instructions for use. |
| N-02 | High | NEEDS REVIEW | **PARTIALLY RESOLVED** | 19 pumps gained `mains`; the definition is documented. 29 `["built-in-battery"]` lists remain with no completeness flag. |
| N-03 | Med | NEEDS REVIEW | **PARTIALLY RESOLVED** | 6 of 11 strengthened or relabelled; 5 remain name-only (I-09). |
| N-04 | Med | FAIL | **RESOLVED** | Pro+ Traditional weight verified 715 g, pump unit. |
| N-05 | Med | FAIL | **RESOLVED** | BabyBuddha 3.0: 4 modes, 30 settings. |
| N-06 | Med | NEEDS REVIEW | **MITIGATED** | Roam's composite `cleaning` string is unchanged, but the exclusions now live in `notWashable` and `partsToClean`. |
| N-07 | Med | NEEDS REVIEW | **MITIGATED** | Dishwasher `detail` on 74/74 values says which parts. No grounding rule yet forbids "the pump is dishwasher safe". |
| N-08 | Med | NEEDS REVIEW | **PARTIALLY RESOLVED** | Luna with Battery: kept value fixed (`at-least` 120 min); the alternative "4+ hours" is still `up-to` 240. Stride and Thrive unchanged. |
| N-09 | Low | NEEDS REVIEW | **PARTIALLY RESOLVED** | W1 now inferred. V1 Pro verified vs V2 Pro inferred on equivalent wording. |
| N-10 | Med | NEEDS REVIEW | **PARTIALLY RESOLVED** | `multiUser` unknown 67 → 44; 33 electric classifications still assume single-user, undisclosed. |
| N-11 | Low | NEEDS REVIEW | **OPEN (changed)** | eufy pair now distinguishable. Evenflo pair: see A-01. |
| N-12 | Low | NEEDS REVIEW | **MITIGATED** | Maintainer notes record each identity question; the records themselves are unchanged. |
| N-13 | Med | NEEDS REVIEW | **OPEN** | 9 of the original grounding gaps remain (section 6). |
| N-14 | Low | NEEDS REVIEW | **PARTIALLY RESOLVED** | The S9 Pro sessions-only sentence is gone. DATA.md still says "191/191 entries compared"; the provider returns 188 quotes. |
| N-15 | Low | NEEDS REVIEW | **OPEN (unchanged)** | Of the 29 fresh product regions, 13 contain retail prices (e.g. "$29.99") and 16 contain insurance calls-to-action ("Order through insurance", "Qualify Through Insurance Now"). None has reached a product record or the grounding payload. |
| N-16 | Low | NEEDS REVIEW | **RESOLVED** | Elvie Curve `collection` = `one-piece-silicone` (D5). |

New findings:

| ID | Sev. | Status | Finding |
|---|---|---|---|
| A-01 | Low | NEEDS REVIEW | Evenflo Deluxe Advanced Double `multiUser` is unknown while Advanced Double is verified single-user. The maintainer note says Deluxe is the same pump plus a bag and cooler. The two records now differ only on this attribute, and the difference is an artifact of which manual was read. |
| A-02 | Med | ACCEPTED RISK | 140 verified values have no verbatim quote (owner-verified or paraphrased research rows); 3 owner-verified weights cite no source. They are labelled correctly but cannot be checked automatically. Accepted under the working-values policy. |
| A-03 | Low | ACCEPTED RISK | 9 weights are retailer listings (Low confidence); the research itself notes Zomee Z2's 2.4 lb "may include accessories" for a pump Zomee calls palm-sized. |
| A-04 | Low | NEEDS REVIEW | Audit tooling: `scripts/catalog/fetch.py` saves PDFs as if they were HTML, so the two Medela manuals (sources added 2026-11-11) produce unreadable snapshots and 4 false "quote not found" failures. All 4 quotes were confirmed present by extracting the PDF text directly. Lansinoh and Momcozy refuse the script's self-identified requests (HTTP 429 even after 15 minutes idle); they were not bypassed. |

---

## 4. Attribute coverage and comparison readiness

### Per attribute (74 products)

| Dimension | Attribute | Verified | Inferred | Not applicable | Unknown | Known % (incl. n/a) | 2026-11-11 |
|---|---|---|---|---|---|---|---|
| Architecture | derived classification | 35 (no inferred basis) | 39 (`usesInferred`) | — | 0 | 100 | 98.6 |
| | mechanism | 32 | 42 | 0 | 0 | 100 | 100 |
| | collection | 69 | 5 | 0 | 0 | 100 | 94.6 |
| | multiUser | 25 | 5 | 0 | 44 | 40.5 | 9.5 |
| | pumping | 41 | 9 | 0 | 24 | 67.6 | 48.6 |
| Battery & power | powerSources | 56 | 15 | 0 | 3 | 95.9 | 91.9 |
| | batteryLife | 32 | 9 | 24 | 9 | 87.8 | 29.7 |
| | batterySessions | 25 | 1 | 24 | 24 | 67.6 | 27.0 |
| Portability & weight | portabilityClass (new) | 0 | 57 | 0 | 17 | 77.0 | — |
| | portability (traits) | 17 | 0 | 0 | 57 | 23.0 | 23.0 |
| | weight | 62 | 12 | 0 | 0 | 100 | 32.4 |
| Hands-free | handsFree | 38 | 36 | 0 | 0 | 100 | 62.2 |
| Cleaning | dishwasherSafe | 68 | 6 | 0 | 0 | 100 | 32.4 |
| | cleaning | 26 | 0 | 0 | 48 | 35.1 | 33.8 |
| | partsToClean (new) | 32 | 0 | 0 | 42 | 43.2 | — |
| | topRackOnly / notWashable / handWashRecommended / cycleRestriction (new) | 29 / 25 / 22 / 7 | 0 | 0 | 45 / 49 / 52 / 67 | 39 / 34 / 30 / 9 | — |
| Noise | noise | 21 | 1 | 0 | 52 | 29.7 | 28.4 |
| Suction | maxSuction | 40 | 1 | 0 | 33 | 55.4 | 52.7 |
| | suctionLevels | 48 | 0 | 0 | 26 | 64.9 | 60.8 |
| Other | closedSystem | 38 | 3 | 0 | 33 | 55.4 | — |
| | capacity | 49 | 4 | 0 | 21 | 71.6 | — |

Max suction, suction levels, included items, features and capacity for traditional pumps were **out of scope** for the research package by owner decision; their unknowns are not research gaps. Where only one of battery life and battery sessions is known, the other is out of scope (report R4).

### Per product (7 dimensions)

Same definitions as before; a dimension counts as covered when verified or inferred, and battery runtime counts as covered when not applicable.

| Dimension | Products covered |
|---|---|
| Architecture | 74 |
| Battery & power | 71 |
| Weight | 74 |
| Hands-free | 74 |
| Cleaning | 74 |
| Noise | 22 |
| Suction | 41 |

| Dimensions covered | Products now | 2026-11-11 |
|---|---|---|
| 7 | 17 | 1 |
| 6 | 28 | 8 |
| 5 | 27 | 21 |
| 4 | 2 | 13 |
| 3 | 0 | 17 |
| ≤ 2 | 0 | 14 |

**Comparison-specific cautions (still apply):**
- **Noise.** 22 values. Manufacturer claims with unstated measurement conditions, mixed comparators. Momcozy S9 Pro's 50 dB is a tie-conservative rule value.
- **Weight.** 74/74 known, but scopes differ (motor, per-cup, per-collector, single unit, pair, kit, assembled, with accessories, whole product, unspecified), 9 are retailer listings and 3 owner weights have no source. Compare only within a scope; compute display totals in the app (report §8).
- **Battery.** Minutes and sessions are separate units and must not be converted. 3 runtime values are rule-resolved.
- **Suction.** 300 mmHg figures are not like-for-like (Stride single-cup setup).
- **Dishwasher.** Use `label` and `detail`; never "the pump is dishwasher safe".

---

## 5. Grounding evaluation

**No Claude integration exists.** Everything below evaluates the payload from `lib/grounding.ts`.

### What `buildGroundingContext` supplies now

| Section | Contents |
|---|---|
| `rules` | 16 rules (was 7): label-driven presentation of manufacturer-verified, owner-verified, inferred, rule-resolved, retailer-listed and not-applicable facts; research citations and key quotes; consumer ratings. |
| `products[]` | As before, plus a `label` on every fact, a `notApplicable[]` section with reasons, `ruleResolution` (basis and other values with citations) on rule-settled facts, and research and owner-decision citations. |
| `consumerRatings[]` (new) | Noise and cleaning ratings with confidence, mention counts, review status, rating source, caveats, evidence origin. Kept out of product facts; the ratings file's dishwasher column is left out. |
| `offers[]` | Unchanged: verbatim, simulated label, no list price or insurer amount. |

### Original 30 cases: 44 of 53 checks pass

Checks were re-run against the current payload. Where the data model changed, the check was restated with the same intent (noted in the JSON): conflicts are now rule-resolved `inferred` values with alternatives; G10 now checks that power is reported with its status (eufy S2 unknown, S2 Pro inferred); G29 and G30 were re-run directly.

| Category | Result now |
|---|---|
| Missing specs (G01–G03) | G01, G02 pass (Willow Go weight now known: 0.8 lb, single unit, retailer listing). **G03 fails:** the payload still does not say the Evenflo pair is the same pump. |
| Conflicts (G04–G07) | Roam, S9 Pro, NaturalWave and Luna now arrive as rule-resolved `inferred` values with the other value and its citation. **G07 fails:** Luna's alternative "4+ hours" is still `up-to`. |
| Similar names / variants (G08–G11) | Pass, including Mya Joy (runtime not applicable, replaceable batteries) vs PLUS (owner-verified mains + battery). **G09 fails:** `variantOf` not in the payload. |
| Battery units (G12–G14) | Values and comparators preserved. **G12, G13 fail:** no rule against session↔minute conversion, no comparator explanation. |
| Cleaning scope (G15–G18) | G17 now passes: dishwasher `detail` limits Willow 360 to its two parts. G15, G18 pass. **G16 fails (rule part):** no rule forbids generalising to the whole pump, although `detail` now says the page names no parts. |
| Noise (G19–G20) | **G20 fails:** no rule on cross-brand dB comparability. |
| Suction (G21) | **Fails:** Stride's single-cup qualifier still only inside the quote. |
| Hands-free / power / provenance / classification (G22–G27) | G25 W1 now an interpretation, not manufacturer-verified. G26 M6 now classified wearable. G27 now passes: Evenflo Advanced Double `multiUser` is verified false. **G23 fails:** no list-completeness signal (S1 Plus now `[mains, built-in-battery]`, inferred). |
| Insurance pricing (G28–G30) | All pass. |

### New research-package cases: 9 of 9 checks pass

| Case | Question | Checks |
|---|---|---|
| G31 | Is the Mya Joy PLUS confirmed by Ameda to run while plugged in? | Label owner-verified; rules forbid calling it a manufacturer statement |
| G32 | How heavy is the Medela Sonata? | Rule-resolved 1.1 kg with the 2.2 lb alternative; the kept value does not show the 2.2 lb quote |
| G33 | How long does the Ameda One-Hand Manual battery last? | Not applicable (manual pump), not unknown |
| G34 | How much does the Motif Manual Silicone weigh? | Labelled retailer listing |
| G35 | Is the Willow Wave hands-free? | `no`, owner decision |
| G36 | Is the Spectra S1 Plus quiet according to reviews? | Ratings in their own section with confidence; never inside product facts |

### Still recommended (not implemented)

Rules 1–7 of the previous audit remain open: comparators; sessions vs minutes; dishwasher scope (now easier: point Claude at `detail`); list completeness; noise comparability; `variantOf` in the payload; the `multiUser` assumption in the classification basis. Two additions: tell Claude when two records are the same pump (from maintainer notes), and fix the Luna alternative's comparator.

---

## 6. Regression results

Run 2026-11-19 on Node v22.23.4 at `e7669a0`.

| Command | Result |
|---|---|
| `npm test` | exit 0 · **310 passed**, 0 failed, 1,447 skipped (the opt-in snapshot suite). Per file: semantics 193, research-import 20, provider 15, search 15, catalog 14, grounding 13, scenarios 12, corrections 12, suppliers 8, labels 5, export 3. |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0, no warnings |
| `npm run build` | exit 0 on the second run (`/`, `/_not-found` static). The first run compiled and generated every page, then exited 1 at Next.js 16.4.3's security-advisory gate, which stops every other build. Not related to the catalog; the owner is handling the Next.js upgrade separately. |
| `python3 scripts/catalog/import_research.py --check` | exit 0: overlay, ratings, ledger and dry run are current |
| Source snapshot verification (`SOURCE_SNAPSHOTS=<29 fresh regions>`) | 656 passed / 791 failed. **0 drift:** 500 quote checks pass, and the 4 failures (2 Medela manuals) are a PDF-extraction artifact; all 4 quotes were confirmed in the PDFs. 127 unknown-with-signal checks pass. The other 787 failures are sources not fetched: 46 missing snapshots, 688 quotes on them, 53 supplier-listing checks (supplier pages are out of scope, as before). |

**Offers.** 188/188 simulated quotes are labelled simulated. Quote statuses per plan are unchanged by the package: no simulated offering carries a product whose classification changed (only Momcozy M6 changed, and it is not offered). Scenarios A, B and H pass in `lib/scenarios.test.ts`. G29: Scenario B's $0 and $75 totals are passed verbatim; list price and insurer amount are not exposed. G30: an unknown plan returns `coverage_unverified` with no offers.

---

## 7. Remaining risks

1. **Unchecked research values (medium, accepted).** Most new values were accepted without independent verification. 140 verified values have no verbatim quote; OCR and third-party figures are listed in section 3. Accepted under the working-values policy; the labels disclose it.
2. **Grounding guidance gaps (medium).** The payload is honest and now labelled, but Claude still gets no rules for comparators, units, dishwasher scope, list completeness or noise comparability. Model behaviour is untested.
3. **Power-list completeness (medium, was high).** 29 battery-only lists carry no completeness flag.
4. **Classification assumptions (medium).** 5 name-only wearables; 33 electric classifications assume single-user from an unknown.
5. **Sparse noise and suction (medium).** Noise 30 %, max suction 55 %. Suction was out of research scope.
6. **Source freshness (medium, was low).** Only 29 of 75 sources were re-checked live (0 drift). Lansinoh and Momcozy now refuse automated fetches, so 18 of their sources can no longer be re-checked with the current tool; 28 more sources were not reached. Their last live check was 2026-11-11.
7. **Small data inconsistencies (low).** Evenflo pair `multiUser` (A-01), V1 vs V2 Pro closedSystem (N-09), Luna alternative comparator (N-08), DATA.md "191/191" (N-14).

---

## 8. Final verdict

### **READY WITH LIMITATIONS**

**Why better than 2026-11-11.**
- All three FAIL-level errors are fixed; no FAIL-level finding remains.
- All conflicts are settled by a documented rule without dropping the other values.
- Coverage: weight, dishwasher, hands-free and collection 74/74; no product is near-empty.
- Every fact Claude receives says who stands behind it, and owner-verified values are never presented as manufacturer statements.

**Why not READY.**
- Most new values were accepted without independent checks (by decision), and 140 verified values have no verbatim quote.
- The grounding rules still lack the guidance for qualified, scoped and list-valued facts that the previous audit recommended.
- Noise and suction coverage remain thin.
- Only 29 of 75 sources were re-checked live this time.

**Limitations Milestone 2 must respect:**
1. Show each value's label. Never present owner-verified, inferred, rule-resolved or retailer-listed values as manufacturer statements.
2. Do not rank on noise, weight, battery runtime or suction unless both products have a value in the same unit, scope and comparator class; weight only within one scope.
3. Do not present `powerSources` lists as exhaustive.
4. Disclose that pump category is a PumpPath classification.
5. Keep consumer ratings visually separate from facts, with their confidence and caveats.
6. Keep every offer labelled simulated.

**Recommended next (each needs approval; none was applied):**
1. Add grounding rules 1–7 of the previous audit (comparators, sessions vs minutes, dishwasher `detail`, list completeness, noise, `variantOf`, `multiUser` assumption).
2. Fix the small inconsistencies: Luna alternative comparator, Evenflo Deluxe `multiUser`, V1/V2 Pro closedSystem, DATA.md "191/191".
3. Strengthen the 5 remaining name-only wearable `collection` values.

*Audit only. Nothing was changed in the catalog.*
