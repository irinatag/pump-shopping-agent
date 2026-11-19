#!/usr/bin/env python3
"""Deterministic converter for the PumpPath research package (2026-11-12).

Reads docs/PUMPPATH_RESEARCH_FINAL.csv and docs/PUMPPATH_CONSUMER_RATINGS.csv (never writes them),
checks their SHA-256 against docs/PUMPPATH_PACKAGE_MANIFEST.json, takes before-values from the
hand-written catalog as it stood before this package (docs/research-import/BASELINE_CATALOG.json:
docs/CATALOG_EXPORT.json at commit 135428c, frozen because the live export now includes this
package; its SHA-256 is recorded as catalogExportSha256), and writes:

  lib/products/data/research-2026-11-12.ts   attribute results + maintainer notes (overlay)
  lib/ratings/consumer-ratings-2026-11-12.ts consumer ratings, every column as supplied
  docs/research-import/LEDGER.json           one entry per CSV row: disposition, before, after
  docs/research-import/DRY_RUN.md            summary

Every row is accounted for. Values that need interpretation (numbers, scopes, prose) come from the
explicit tables below, each keyed by product + attribute and pinned to the exact proposedValue
text, so an edited CSV fails loudly instead of converting silently.

Usage: python3 -I scripts/catalog/import_research.py [--check]
  --check  regenerate in memory and fail if any output file differs (determinism / staleness).
Standard library only.
"""

import csv
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
RESEARCH_CSV = DOCS / "PUMPPATH_RESEARCH_FINAL.csv"
RATINGS_CSV = DOCS / "PUMPPATH_CONSUMER_RATINGS.csv"
MANIFEST = DOCS / "PUMPPATH_PACKAGE_MANIFEST.json"
CATALOG = DOCS / "research-import/BASELINE_CATALOG.json"
OUT_OVERLAY = ROOT / "lib/products/data/research-2026-11-12.ts"
OUT_RATINGS = ROOT / "lib/ratings/consumer-ratings-2026-11-12.ts"
OUT_LEDGER = DOCS / "research-import/LEDGER.json"
OUT_SUMMARY = DOCS / "research-import/DRY_RUN.md"

PACKAGE = "pumppath-research-2026-11-12"

# ---- owner decisions made during integration (2026-11-13) ----------------------------------

OWNER_DECISIONS = {
    ("willow-wave", "handsFree"): {
        "decidedOn": "2026-11-13",
        "statement": "Willow Wave is not hands-free: it requires the mother to pump manually.",
        "value": "no",
        # Row whose wording supports the decision (Willow Wave collection: "...; not hands-free").
        "supportingRow": ("willow-wave", "collection"),
    },
}

# ---- column vocabularies -------------------------------------------------------------------

ACTIONS = {
    "Update": "update",
    "Add new attribute": "add",
    "Confirm (no value change)": "confirm",
    "Out of scope (owner decision)": "unchanged-out-of-scope",
    "Catalog value kept, not re-checked (owner decision)": "unchanged-retained",
    "Update (conflict resolved by owner rule; both values kept in limitations)": "rule-resolved",
    "Note for maintainers (not an attribute update)": "maintainer-note",
}
EVIDENCE_CLASS = {
    "Manufacturer fact": "manufacturer",
    "Owner-verified fact": "owner-verified",
    "Retailer or supplier listing": "retailer-listing",
    "Derived from catalog facts": "derived-from-catalog",
}
ATTRIBUTE = {
    "cleaningRestrictions.topRackOnly": "topRackOnly",
    "cleaningRestrictions.notWashable": "notWashable",
    "cleaningRestrictions.handWashRecommended": "handWashRecommended",
    "cleaningRestrictions.cycleRestriction": "cycleRestriction",
}
RULE_BASIS = {"Weight of evidence": "weight-of-evidence", "Tie; conservative value kept": "tie-conservative"}
NOT_APPLICABLE = {
    "Not applicable (manual pump)": "manual-pump",
    "Not applicable (plug-in only)": "plug-in-only",
    "Not applicable (plug-in version)": "plug-in-version",
    "Not applicable (runs on replaceable batteries)": "replaceable-batteries",
}

MANUFACTURER_DOMAINS = [
    "medela.com", "spectrababyusa.com", "motifmedical.com", "lansinoh.com", "momcozy.com", "onewillow.com",
    "elvie.com", "ameda.com", "zomee.com", "babybuddhaproducts.com", "evenflofeeding.com", "eufy.com",
]
SITE = {
    "cdn.shopify.com": "file-host",
    "static.helpjuice.com": "file-host",
    "rootglobal.zendesk.com": "file-host",
    "manuals.plus": "manual-mirror",
    "www.manualslib.com": "manual-mirror",
    "www.globenewswire.com": "press-release",
    "www.reddit.com": "forum-or-blog",
    "mamanloupsden.com": "forum-or-blog",
    "kellysthoughtsonthings.com": "forum-or-blog",
    "www.fairyofpregnancy.com": "forum-or-blog",
    "www.genuinelactation.com": "forum-or-blog",
    "spectrababy.co.za": "regional-site",
    "aeroflowbreastpumps.com": "retailer",
    "apriahome.com": "retailer",
    "cambridgemedsupply.com": "retailer",
    "lactationconnection.com": "retailer",
    "pumpsformom.com": "retailer",
    "shop.birminghambreastfeeding.com": "retailer",
    "www.1naturalway.com": "retailer",
    "www.medicaleshop.com": "retailer",
    "www.militarypumps.com": "retailer",
    "www.mumzworld.com": "retailer",
    "www.rjmedicalsupply.com": "retailer",
    "www.suprememed.com": "retailer",
    "www.target.com": "retailer",
    "www.walmart.ca": "retailer",
    "www.walmart.com": "retailer",
}

# ---- explicit value tables -----------------------------------------------------------------
# (productId, attribute) -> (exact proposedValue, value). First stated figure and unit are kept;
# scope only from what the proposedValue says; anything else stays in the evidence's `stated`.


def m(amount, unit, comparator="eq", **extra):
    return {"amount": amount, "unit": unit, "comparator": comparator, **extra}


def w(amount, unit, scope, comparator="eq", **extra):
    return {"amount": amount, "unit": unit, "comparator": comparator, "scope": scope, **extra}


WEIGHT = {
    "ameda-mya-joy": ("0.5 lb (pump unit)", w(0.5, "lb", "motor")),
    "ameda-mya-joy-plus": ("Approx. 328.4 g (11.6oz) (motor unit; 328.4 g)", w(328.4, "g", "motor", "approximately")),
    "ameda-one-hand-manual": ("About 0.4 to 0.49 lb (about 0.2 kg)", w(0.4, "lb", "unspecified", "approximately", max=0.49)),
    "ameda-platinum": ("Approximately 9.75 lbs. (approximately 4.42 kg) (motor unit; 4420 g)", w(9.75, "lb", "motor", "approximately")),
    "babybuddha-3": ("0.44 kg (about 0.97 lb), pump with accessories", w(0.44, "kg", "with-accessories")),
    "babybuddha-manual": ("0.45 kg (scope not stated)", w(0.45, "kg", "unspecified")),
    "babybuddha-wearable": ("0.6 lb (scope not stated)", w(0.6, "lb", "unspecified")),
    "elvie-curve": ("120g (per cup; 120 g)", w(120, "g", "per-cup")),
    "evenflo-advanced-double-electric": ("1.05 lb (pump unit)", w(1.05, "lb", "motor")),
    "evenflo-advanced-manual": ("0.62 lb", w(0.62, "lb", "unspecified")),
    "evenflo-advanced-single-electric": ("1.39 lb (scope not stated)", w(1.39, "lb", "unspecified")),
    "evenflo-deluxe-advanced-double-electric": ("1.05 lb (pump unit)", w(1.05, "lb", "motor")),
    "evenflo-pocket-double-electric": ("1.4 lb (about 0.64 kg), overall weight", w(1.4, "lb", "whole-product")),
    "lansinoh-discreetduo-flow": ("0.5 lb (scope not stated)", w(0.5, "lb", "unspecified")),
    "lansinoh-manual": ("4.8 oz (listed for the kit) (scope not stated)", w(4.8, "oz", "unspecified")),
    "lansinoh-naturalwave": ("Approximately 1.7 lbs (motor unit; 771.11 g)", w(1.7, "lb", "motor", "approximately")),
    "lansinoh-signature-comfort": ("About 2.31 lb (1.05 kg), total product weight", w(2.31, "lb", "whole-product", "approximately")),
    "lansinoh-silicone": ("0.35 lb (assembled pump; 158.76 g)", w(0.35, "lb", "assembled-pump")),
    "lansinoh-smartpump-3": ("2 lb", w(2, "lb", "unspecified")),
    "lansinoh-thrive-2-in-1": ("0.5 lb (scope not stated)", w(0.5, "lb", "unspecified")),
    "lansinoh-wearable": ("7.4 oz per cup", w(7.4, "oz", "per-cup")),
    "medela-freestyle-mini-hands-free": ("205 g (pump unit)", w(205, "g", "motor")),
    "medela-harmony": ("105 g", w(105, "g", "unspecified")),
    "medela-melody-inbra": ("245 g per pump with all accessories", w(245, "g", "with-accessories")),
    "medela-motion-inbra": ("250 g (8.8 oz) per cup", w(250, "g", "per-cup")),
    "momcozy-air-1": ("260 g per cup", w(260, "g", "per-cup")),
    "momcozy-s12-pro-quick": ("240 g per pump", w(240, "g", "single-wearable-unit")),
    "momcozy-s9-pro": ("250 g per pump", w(250, "g", "single-wearable-unit")),
    "momcozy-v1-pro": ("240 g pump motor plus 120 g per milk collector",
                       w(240, "g", "motor", components=[w(120, "g", "per-collector")])),
    "momcozy-v2-pro": ("127 g pump motor plus 130 g per milk collector",
                       w(127, "g", "motor", components=[w(130, "g", "per-collector")])),
    "momcozy-wellness-1": ("320 g per pump", w(320, "g", "single-wearable-unit")),
    "motif-aura-glow": ("0.55 lb", w(0.55, "lb", "unspecified")),
    "motif-manual-silicone": ("Less than 3 oz", w(3, "oz", "unspecified", "lt")),
    "spectra-handy-plus": ("0.18kg (assembled pump; 180 g)", w(0.18, "kg", "assembled-pump")),
    "spectra-premier-wearable": ("305 g", w(305, "g", "unspecified")),
    "spectra-s3-pro": ("2lbs 13oz (motor unit; 1275.73 g)", w(2, "lb", "motor", plus={"amount": 13, "unit": "oz"})),
    "spectra-synergy-gold": ("1.5 lb", w(1.5, "lb", "unspecified")),
    "spectra-synergy-gold-portable": ("1.5 lb", w(1.5, "lb", "unspecified")),
    "willow-360": ("0.78 lbs (12.5 oz) (per cup; 354.37 g)", w(0.78, "lb", "per-cup")),
    "willow-go": ("0.8 lb per pump", w(0.8, "lb", "single-wearable-unit")),
    "willow-silicone-wearable": (".2 Pounds (assembled pump; 90.72 g)", w(0.2, "lb", "assembled-pump")),
    "willow-sync": ("350g (assembled pump; 350 g)", w(350, "g", "assembled-pump")),
    "willow-wave": (".9 Pounds (assembled pump; 408.23 g)", w(0.9, "lb", "assembled-pump")),
    "zomee-fit": ("0.58 lb (scope not stated)", w(0.58, "lb", "unspecified")),
    "zomee-mothers-nature-h1": ("1.85 pounds (motor unit; 839.15 g)", w(1.85, "lb", "motor")),
    "zomee-mothers-nature-w1": ("0.6 lbs (per cup; 272.16 g)", w(0.6, "lb", "per-cup")),
    "zomee-z2": ("2.4 lb", w(2.4, "lb", "unspecified")),
    "eufy-s2": ("About 0.65 lb (about 10.4 oz) per pump", w(0.65, "lb", "single-wearable-unit", "approximately")),
    "eufy-s2-pro": ("0.7 lb (scope not stated)", w(0.7, "lb", "unspecified")),
}

BATTERY_LIFE = {
    "babybuddha-3": ("About 1 hour (2-4 sessions)", m(60, "min", "approximately")),
    "medela-pump-in-style-pro-plus-hands-free": ("1 hour", m(60, "min")),
    "medela-pump-in-style-pro-plus-traditional": ("1 hour", m(60, "min")),
    "momcozy-v2-pro": ("180 minutes (5-6 sessions)", m(180, "min")),
    "zomee-z2": ("2+ hours", m(120, "min", "at-least")),
    "momcozy-v1-pro": ("270 minutes (7-9 sessions)", m(270, "min")),
    "lansinoh-wearable": ("3 hours", m(180, "min")),
    "spectra-s3-pro": ("3 hours on a full charge", m(180, "min")),
    "eufy-s2": ("6.5 hours", m(390, "min")),
    "eufy-s2-pro": ("6.5 hours", m(390, "min")),
    "zomee-mothers-nature-h1": ("About 2 hours (120 minutes) of continuous use", m(120, "min", "approximately")),
    "lansinoh-smartpump-3": ("About 2 hours at maximum settings", m(120, "min", "approximately")),
    "spectra-9-plus": ("About 2 hours on a full charge", m(120, "min", "approximately")),
    "spectra-s1-plus": ("About 3 hours", m(180, "min", "approximately")),
    "medela-symphony-plus": ("About 60 minutes", m(60, "min", "approximately")),
    "spectra-synergy-gold-portable": ("At least 2 hours of double pumping on a full charge", m(120, "min", "at-least")),
    "lansinoh-thrive-2-in-1": ("Up to 250 minutes", m(250, "min", "up-to")),
}

BATTERY_SESSIONS = {
    "babybuddha-3": ("2-4 sessions per charge", m(2, "sessions", max=4)),
    "medela-sonata": ("3-4 sessions per charge", m(3, "sessions", max=4)),
    "momcozy-v2-pro": ("5-6 sessions per charge", m(5, "sessions", max=6)),
    "spectra-premier-wearable": ("5-6 sessions per charge", m(5, "sessions", max=6)),
    "momcozy-air-1": ("6-7 sessions per charge (18-20 with the charging case)", m(6, "sessions", max=7)),
    "medela-magic-inbra": ("8 sessions of 15 minutes per charge", m(8, "sessions")),
    "evenflo-pocket-double-electric": ("Up to 20 sessions per charge", m(20, "sessions", "up-to")),
}

CAPACITY = {
    "babybuddha-wearable": ("More than 6 oz collection capacity; 8 oz cup volume", m(6, "oz", "at-least")),
    "elvie-stride": ("5 oz per cup", m(5, "oz", scope="per-cup")),
    "medela-freestyle-mini-hands-free": ("150 mL / 5 oz per cup", m(150, "ml", scope="per-cup")),
    "medela-magic-inbra": ("150 mL / 5 oz per container", m(150, "ml", scope="per-container")),
    "medela-pump-in-style-pro-plus-hands-free": ("5 oz (150 mL) per cup", m(5, "oz", scope="per-cup")),
    "momcozy-v1-pro": ("230 mL / 7.8 oz per collector", m(230, "ml", scope="per-collector")),
    "momcozy-v2-pro": ("230 mL / 7.8 oz per collector", m(230, "ml", scope="per-collector")),
    "momcozy-wellness-1": ("180 mL (6 oz) per cup", m(180, "ml", scope="per-cup")),
    "lansinoh-naturalwave": ('5 oz (the "60 ml" figure is inconsistent with 5 oz)', m(5, "oz")),
    "motif-manual-silicone": ("4 oz", m(4, "oz")),
    "spectra-premier-wearable": ("160 mL (about 5.4 oz) per container", m(160, "ml", scope="per-container")),
    "zomee-fit": ("6 oz (current container); 150 ml refers to the original Fit container", m(6, "oz", scope="per-container")),
    "eufy-s2": ("5 oz container included (7 oz sold separately)", m(5, "oz", scope="per-container")),
    "eufy-s2-pro": ("5 oz container included (7 oz sold separately)", m(5, "oz", scope="per-container")),
}

MAX_SUCTION = {
    "momcozy-air-1": ("285 mmHg", m(285, "mmHg")),
}

PROSE = {
    ("ameda-pearl", "collection"): (
        "No collection kit in the box (pump, AC power adapter, instructions, quick start card); uses the separately sold HygieniKit",
        ["kit-sold-separately"]),
    ("ameda-platinum", "collection"): (
        "Uses the separately sold Ameda HygieniKit milk collection system (flanges and bottles); no kit in the box",
        ["kit-sold-separately"]),
    ("medela-symphony-plus", "collection"): (
        "Pump sets (kits) are separate products used with the pump; none in the box", ["kit-sold-separately"]),
    ("elvie-curve", "collection"): ("Manual, in-bra silicone pump (architecture: Manual)", ["one-piece-silicone"]),
    ("ameda-pearl", "multiUser"): ("true in a hospital setting; single-user at home", True),
}

# Rule-resolved conflicts (research rule R1). Selected value, and the alternatives kept with their evidence.
# "catalog:<i>" = the i-th candidate of the catalog's current conflict; "catalog" = the current single value;
# "row" = the research row itself (the other value is described in its limitations).
RULE_RESOLVED = {
    ("ameda-mya-joy-plus", "batteryLife"): {
        "stated": "Up to 180 minutes (3 hours); note Ameda's guide says about 120 minutes",
        "selected": (m(180, "min", "up-to"), ["catalog", "row"]),
        "alternatives": [(m(120, "min", "approximately"), ["row"])],
    },
    ("medela-sonata", "batteryLife"): {
        "stated": "Up to 1 hour; note the feature copy says 1.5 hours",
        "selected": (m(60, "min", "up-to"), ["catalog:1", "row"]),
        "alternatives": [(m(90, "min"), ["catalog:0"])],
    },
    ("medela-sonata", "weight"): {
        "stated": "1.1 kg (about 2.4 lb), pump only; note the page says 2.2 lb",
        "selected": (w(1.1, "kg", "motor"), ["row"]),
        "alternatives": [(w(2.2, "lb", "motor"), ["catalog"])],
    },
    ("momcozy-m6-mobile-style", "maxSuction"): {
        "stated": "Up to 295 mmHg; note the specification block gives a band of -285 to -300",
        "selected": (m(295, "mmHg", "up-to"), ["catalog:1", "row"]),
        "alternatives": [(m(285, "mmHg", max=300), ["catalog:0"])],
    },
    ("momcozy-s9-pro", "noise"): {
        "stated": "50 dB; note the specification block says under 45 dB",
        "selected": (m(50, "dB"), ["catalog:1", "row"]),
        "alternatives": [(m(45, "dB", "lt"), ["catalog:0"])],
    },
    ("motif-luna-with-battery", "batteryLife"): {
        "stated": "Over 2 hours (lower bound); note newer page copy says 4+ hours",
        "selected": (m(120, "min", "at-least"), ["catalog:0", "row"]),
        "alternatives": [(m(240, "min", "up-to"), ["catalog:1"])],
    },
    ("motif-roam", "batteryLife"): {
        "stated": "Approximately 120 minutes; note the description says up to 90",
        "selected": (m(120, "min", "approximately"), ["catalog:1", "row"]),
        "alternatives": [(m(90, "min", "up-to"), ["catalog:0"])],
    },
    ("spectra-9-plus", "weight"): {
        "stated": "290 g (about 0.64 lb); note the product page says 0.5 lb",
        "selected": (w(290, "g", "unspecified"), ["row"]),
        "alternatives": [(w(0.5, "lb", "unspecified"), ["catalog"])],
    },
}

# Dishwasher: which parts, from the proposedValue wording, for rows that replace a value.
DISHWASHER_PARTS = {
    "ameda-mya-joy": "some", "ameda-mya-joy-plus": "some", "ameda-one-hand-manual": "some", "ameda-pearl": "some",
    "ameda-platinum": "some", "babybuddha-wearable": "unspecified", "elvie-curve": "all",
    "evenflo-advanced-double-electric": "some", "evenflo-advanced-manual": "some",
    "evenflo-advanced-single-electric": "some", "evenflo-deluxe-advanced-double-electric": "some",
    "evenflo-pocket-double-electric": "some", "lansinoh-discreetduo-flow": "some", "lansinoh-naturalwave": "some",
    "lansinoh-smartpump-3": "some", "medela-harmony": "unspecified", "medela-magic-inbra": "unspecified",
    "medela-sonata": "unspecified", "medela-symphony-plus": "some", "spectra-9-plus": "some",
    "spectra-handy-plus": "some", "spectra-premier-wearable": "some", "spectra-s1-plus": "some",
    "spectra-s2-plus": "some", "spectra-s3-pro": "some", "spectra-synergy-gold": "some",
    "spectra-synergy-gold-portable": "some", "zomee-fit": "some", "zomee-mothers-nature-h1": "some",
    "zomee-mothers-nature-w1": "some", "zomee-z2": "some", "eufy-s2": "some", "eufy-s2-pro": "some",
}

# ---- helpers -----------------------------------------------------------------------------


class ConversionError(Exception):
    pass


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_csv(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def strip_defaults(e):
    """Export-form source quote -> catalog form (implicit kind/scope/section defaults omitted)."""
    if e.get("kind") != "source-quote":
        return e
    out = {"sourceId": e["sourceId"], "quote": e["quote"]}
    if e["scope"] != "this-product":
        out["scope"] = e["scope"]
    if e["section"] != "product-content":
        out["section"] = e["section"]
    return out


def site_of(url: str) -> str:
    host = urlparse(url).netloc.lower()
    if any(host == d or host.endswith("." + d) for d in MANUFACTURER_DOMAINS):
        return "manufacturer"
    if host not in SITE:
        raise ConversionError(f"no site type for host {host} ({url})")
    return SITE[host]


def links(cell: str):
    """URLs with their site type, and any non-URL source descriptions, both in the order given."""
    out, texts, seen = [], [], set()
    for token in (t.strip() for t in cell.split(" | ")):
        if not token or token in seen:
            continue
        seen.add(token)
        if token.startswith("https://"):
            out.append({"url": token, "site": site_of(token)})
        else:
            texts.append(token)
    return out, texts


def research_evidence(r, line):
    ev = {
        "kind": "research",
        "evidenceClass": EVIDENCE_CLASS[r["evidenceClass"]],
        "package": PACKAGE,
        "csvLine": line,
        "stated": r["proposedValue"],
        "summary": r["evidenceSummary"],
    }
    if r["keyQuote"]:
        ev["keyQuote"] = r["keyQuote"]
    ev["quoteStatus"] = r["quoteStatus"]
    ev["links"], source_texts = links(r["sourceUrl"])
    if source_texts:
        ev["sourceText"] = source_texts
    ev["confidence"] = r["confidence"]
    if r["limitations"]:
        ev["limitations"] = r["limitations"]
    return ev


def norm_text(s: str) -> str:
    return re.sub(r"\s+", " ", s.replace("’", "'").replace("‘", "'")).strip().lower()


def leading_list(pv: str):
    hit = re.match(r"^\[([a-z\-, ]+)\]", pv)
    return [x.strip() for x in hit.group(1).split(",")] if hit else None


def split_top_level(text: str):
    items, depth, cur = [], 0, ""
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            items.append(cur.strip())
            cur = ""
        else:
            cur += ch
    items.append(cur.strip())
    return [i for i in items if i]


def pinned(table, key, pv, what):
    if key not in table:
        raise ConversionError(f"{what}: no explicit mapping for {key}")
    expected, value = table[key]
    if expected != pv:
        raise ConversionError(f"{what} {key}: proposedValue changed: {pv!r} != {expected!r}")
    return json.loads(json.dumps(value))


# ---- conversion --------------------------------------------------------------------------


def convert_value(r, attr, before):
    """Value for an update/add/confirm row (not rule-resolved, not not-applicable)."""
    pid, pv, action = r["productId"], r["proposedValue"], ACTIONS[r["action"]]
    known_before = before["status"] in ("verified", "inferred")

    if (pid, attr) in PROSE:
        return pinned(PROSE, (pid, attr), pv, "prose")

    if action == "confirm" and attr != "dishwasherSafe":
        if not known_before:
            raise ConversionError(f"confirm row {pid}.{attr} has no catalog value and no prose mapping")
        parsed = leading_list(pv)
        if parsed is not None and parsed != before["value"]:
            raise ConversionError(f"confirm row {pid}.{attr}: {parsed} != catalog {before['value']}")
        return before["value"]

    if attr in ("powerSources", "collection"):
        value = leading_list(pv)
        if value is None:
            raise ConversionError(f"{pid}.{attr}: no leading list in {pv!r}")
        return value
    if attr == "multiUser":
        if pv.startswith("false"):
            return False
        raise ConversionError(f"{pid}.multiUser: {pv!r}")
    if attr == "pumping":
        if pv in ("single", "double"):
            return pv
        raise ConversionError(f"{pid}.pumping: {pv!r}")
    if attr == "closedSystem":
        if pv.startswith("true"):
            return True
        raise ConversionError(f"{pid}.closedSystem: {pv!r}")
    if attr == "handsFree":
        return {"false": "no", "true": "as-sold"}[pv]
    if attr == "portabilityClass":
        return {"Portable": "portable", "Stationary": "stationary"}[pv]
    if attr == "topRackOnly":
        if pv.startswith("yes"):
            return True
        raise ConversionError(f"{pid}.topRackOnly: {pv!r}")
    if attr in ("partsToClean", "cleaning", "suctionLevels", "notWashable", "handWashRecommended", "cycleRestriction"):
        return pv
    if attr == "includedItems":
        return split_top_level(pv)
    if attr == "dishwasherSafe":
        label, sep, detail = pv.partition(": ")
        if not sep or label not in ("Dishwasher-safe parts", "Hand-wash only"):
            raise ConversionError(f"{pid}.dishwasherSafe label: {pv!r}")
        detail = re.sub(r' \(quote: ".*"\)$', "", detail)
        if label == "Hand-wash only":
            parts = "none"
        elif action == "confirm":
            parts = before["value"]["parts"]
        else:
            if pid not in DISHWASHER_PARTS:
                raise ConversionError(f"dishwasher parts for {pid}")
            parts = DISHWASHER_PARTS[pid]
        return {"label": "dishwasher-safe-parts" if label == "Dishwasher-safe parts" else "hand-wash-only", "parts": parts, "detail": detail}
    if attr == "weight":
        return pinned(WEIGHT, pid, pv, "weight")
    if attr == "batteryLife":
        return pinned(BATTERY_LIFE, pid, pv, "batteryLife")
    if attr == "batterySessions":
        return pinned(BATTERY_SESSIONS, pid, pv, "batterySessions")
    if attr == "capacity":
        return pinned(CAPACITY, pid, pv, "capacity")
    if attr == "maxSuction":
        return pinned(MAX_SUCTION, pid, pv, "maxSuction")
    raise ConversionError(f"no conversion for {pid}.{attr}: {pv!r}")


def catalog_evidence(before):
    if before["status"] in ("verified", "inferred", "not-applicable"):
        return [strip_defaults(e) for e in before["evidence"]]
    return []


def evidence_for_value(before, value):
    """Catalog evidence that supports `value`: the current value's evidence, or matching conflict candidates."""
    if before["status"] in ("verified", "inferred") and before["value"] == value:
        return catalog_evidence(before)
    if before["status"] == "conflicting":
        return [strip_defaults(c["evidence"]) for c in before["candidates"] if c["value"] == value]
    return []


def existing_quote_evidence(r, before):
    """Rows whose key quote was taken from the catalog's evidence keep that evidence item."""
    if r["quoteStatus"] != "Existing catalog evidence quote" or not r["keyQuote"]:
        return []
    pool = catalog_evidence(before) + (
        [strip_defaults(c["evidence"]) for c in before["candidates"]] if before["status"] == "conflicting" else []
    )
    kq = norm_text(r["keyQuote"])
    return [e for e in pool if "quote" in e and (kq in norm_text(e["quote"]) or norm_text(e["quote"]) in kq)]


def dedupe(evidence):
    out, seen = [], set()
    for e in evidence:
        k = json.dumps(e, sort_keys=True)
        if k not in seen:
            seen.add(k)
            out.append(e)
    return out


def effect(attr, before, after):
    """What the row does to the current catalog attribute."""
    if after["status"] == "not-applicable":
        return "not-applicable set" if before["status"] == "unknown" else "value replaced by not-applicable"
    if before["status"] == "unknown":
        return "new value"
    if before["status"] == "conflicting":
        return "conflict settled"
    same = before["value"] == after["value"]
    if attr == "dishwasherSafe" and not same and before["value"]["parts"] == after["value"]["parts"]:
        same = True  # label and detail added, rack flag moved to topRackOnly; parts unchanged
    if not same:
        return "value replaced"
    return "status changed" if before["status"] != after["status"] else "evidence added"


def inferred_rationale(r):
    parts = [r["evidenceSummary"].strip()]
    if r["limitations"]:
        parts.append(r["limitations"].strip())
    return " ".join(p if p.endswith(".") else p + "." for p in parts if p)


def build(rows, catalog):
    products = {p["id"]: p for p in catalog["products"]}
    entries, notes, ledger = [], [], []
    by_key = {(r["productId"], ATTRIBUTE.get(r["attribute"], r["attribute"])): (i + 2, r) for i, r in enumerate(rows)}

    for i, r in enumerate(rows):
        line = i + 2
        pid = r["productId"]
        action = ACTIONS[r["action"]]
        attr = ATTRIBUTE.get(r["attribute"], r["attribute"])
        if pid not in products:
            raise ConversionError(f"line {line}: unknown product {pid}")
        rec = {"csvLine": line, "productId": pid, "attribute": r["attribute"], "action": r["action"],
               "proposedStatus": r["proposedStatus"], "evidenceClass": r["evidenceClass"]}

        if action in ("unchanged-out-of-scope", "unchanged-retained"):
            rec["disposition"] = action
            if attr in products[pid]["attributes"]:
                rec["before"] = products[pid]["attributes"][attr]
            ledger.append(rec)
            continue
        if action == "maintainer-note":
            note = {"productId": pid, "text": r["proposedValue"], "evidence": research_evidence(r, line)}
            notes.append(note)
            rec["disposition"] = "maintainer-note"
            ledger.append(rec)
            continue

        before = products[pid]["attributes"][attr]
        rev = research_evidence(r, line)
        status = r["proposedStatus"]

        if (pid, attr) in OWNER_DECISIONS:
            d = OWNER_DECISIONS[(pid, attr)]
            sline, srow = by_key[d["supportingRow"]]
            after = {"status": "verified", "value": d["value"], "evidence": [
                {"kind": "owner-decision", "decidedOn": d["decidedOn"], "statement": d["statement"],
                 "supersedes": {"package": PACKAGE, "csvLine": line, "stated": r["proposedValue"]}},
                research_evidence(srow, sline),
            ]}
            change = "owner-decision"
        elif action == "rule-resolved":
            spec = RULE_RESOLVED.get((pid, attr))
            if not spec or spec["stated"] != r["proposedValue"] or status != "inferred":
                raise ConversionError(f"line {line}: rule-resolved row {pid}.{attr} not mapped or changed")

            def resolve(refs):
                out = []
                for ref in refs:
                    if ref == "row":
                        out.append(rev)
                    elif ref == "catalog":
                        if before["status"] not in ("verified", "inferred"):
                            raise ConversionError(f"{pid}.{attr}: no catalog value")
                        out.extend(catalog_evidence(before))
                    else:
                        idx = int(ref.split(":")[1])
                        out.append(strip_defaults(before["candidates"][idx]["evidence"]))
                return out

            value, refs = spec["selected"]
            alternatives = [{"value": v, "evidence": resolve(rf)} for v, rf in spec["alternatives"]]
            # A row's keyQuote can be the quote of the value it rejected (Sonata weight: "2.2lbs" on the
            # 1.1 kg row). It stays with that alternative; the selected value does not show it.
            alt_quotes = {e.get("quote") for a in alternatives for e in a["evidence"]}
            kept = [
                {k: v for k, v in e.items() if k != "keyQuote"} if e.get("kind") == "research" and e.get("keyQuote") in alt_quotes else e
                for e in resolve(refs)
            ]
            after = {
                "status": "inferred",
                "value": value,
                "evidence": kept,
                "rationale": "Manufacturer statements conflict; settled by the owner-approved rule (R1), not by the manufacturer. "
                + inferred_rationale(r),
                "ruleResolution": {
                    "basis": RULE_BASIS[r["ruleBasis"]],
                    "alternatives": alternatives,
                },
            }
            change = "rule-resolved"
        elif status == "not-applicable":
            reason = NOT_APPLICABLE.get(r["proposedValue"])
            if not reason:
                raise ConversionError(f"line {line}: not-applicable wording {r['proposedValue']!r}")
            after = {"status": "not-applicable", "reason": reason, "evidence": [rev]}
            change = action
        elif status in ("verified", "inferred"):
            value = convert_value(r, attr, before)
            if action == "confirm":
                evidence = catalog_evidence(before) + [rev]
            else:
                evidence = evidence_for_value(before, value) + existing_quote_evidence(r, before) + [rev]
            after = {"status": status, "value": value, "evidence": dedupe(evidence)}
            if status == "inferred":
                after["rationale"] = inferred_rationale(r)
            change = action
        else:
            raise ConversionError(f"line {line}: status {status!r} with action {r['action']!r}")

        # Owner rows: verified, owner provenance, never downgraded.
        if r["evidenceClass"] == "Owner-verified fact":
            assert after["status"] == "verified" and r["confidence"] == "Owner-verified", line
            assert any(e.get("evidenceClass") == "owner-verified" for e in after["evidence"]), line

        entries.append({"productId": pid, "attribute": attr, "csvLine": line, "change": change, "result": after})
        rec.update({"disposition": change, "effect": effect(attr, before, after), "before": before, "after": after})
        ledger.append(rec)

    keys = [(e["productId"], e["attribute"]) for e in entries]
    if len(keys) != len(set(keys)):
        raise ConversionError("two rows map to the same product attribute")
    return entries, notes, ledger


# ---- ratings -----------------------------------------------------------------------------

RATING_INT = {"noiseQuietMentions", "noiseModerateMentions", "noiseLoudMentions", "cleaningEasyMentions", "cleaningHardMentions"}


def convert_ratings(rows, catalog_ids):
    out = []
    for i, r in enumerate(rows):
        if r["productId"] not in catalog_ids:
            raise ConversionError(f"ratings line {i + 2}: unknown product {r['productId']}")
        rec = {"csvLine": i + 2}
        for k, v in r.items():
            if k in RATING_INT and v != "":
                if not re.fullmatch(r"\d+", v):
                    raise ConversionError(f"ratings line {i + 2}: {k}={v!r}")
                rec[k] = int(v)
            else:
                rec[k] = v
        out.append(rec)
    return out


# ---- output ------------------------------------------------------------------------------


def ts_module(header, imports, name, typ, value):
    body = json.dumps(value, ensure_ascii=False, indent=1)
    return f"{header}\n{imports}\n\nexport const {name}: {typ} = {body};\n"


def summarize(rows, ledger, entries, notes, ratings, hashes):
    from collections import Counter

    disp = Counter(x["disposition"] for x in ledger)
    status = Counter(e["result"]["status"] for e in entries)
    changed = [x for x in ledger if "after" in x]
    effects = Counter(x["effect"] for x in changed)
    replaced = [x for x in changed if x["effect"] in ("value replaced", "conflict settled", "value replaced by not-applicable")]
    downgraded = [x for x in changed if x["before"]["status"] == "verified" and x["after"]["status"] != "verified"]

    def show(a):
        if a["status"] in ("verified", "inferred"):
            return f"{a['status']} `{json.dumps(a['value'], ensure_ascii=False)}`"
        if a["status"] == "conflicting":
            return "conflicting " + " / ".join(f"`{json.dumps(c['value'], ensure_ascii=False)}`" for c in a["candidates"])
        if a["status"] == "not-applicable":
            return f"not-applicable ({a['reason']})"
        return a["status"]
    owner = [x for x in ledger if x["evidenceClass"] == "Owner-verified fact"]
    lines = [
        "# Research package import: dry run",
        "",
        "Generated by `scripts/catalog/import_research.py`. Do not edit; re-run the script.",
        "",
        f"- Package: `{PACKAGE}` (baseline `{hashes['baseline']}`)",
        f"- Research CSV SHA-256: `{hashes['research']}` (matches manifest)",
        f"- Consumer CSV SHA-256: `{hashes['ratings']}` (matches manifest)",
        f"- Before-values: `docs/research-import/BASELINE_CATALOG.json`, the hand-written catalog before this package (`{hashes['catalog'][:12]}…`)",
        "",
        "## Every research row",
        "",
        "| Disposition | Rows |",
        "|---|---|",
        *[f"| {k} | {v} |" for k, v in sorted(disp.items())],
        f"| **Total** | **{len(ledger)}** of {len(rows)} |",
        "",
        "## Resulting attribute statuses (rows that set an attribute)",
        "",
        "| Status | Attributes |",
        "|---|---|",
        *[f"| {k} | {v} |" for k, v in sorted(status.items())],
        "",
        f"- Owner-verified rows: {len(owner)}; attribute rows kept `verified` with owner provenance: "
        f"{sum(1 for x in owner if x['disposition'] not in ('maintainer-note',) and x['after']['status'] == 'verified')}; "
        f"maintainer notes: {sum(1 for x in owner if x['disposition'] == 'maintainer-note')}.",
        f"- Maintainer notes kept out of attribute fields: {len(notes)}.",
        "## Effect on the current catalog (rows that set an attribute)",
        "",
        "| Effect | Rows |",
        "|---|---|",
        *[f"| {k} | {v} |" for k, v in sorted(effects.items())],
        "",
        f"- Verified before, not verified after (status supplied by the row): {len(downgraded)}.",
        f"- Consumer rating rows converted: {len(ratings)}.",
        "",
        "## Verified before, not verified after",
        "",
        "| Line | Product | Attribute | After | Why |",
        "|---|---|---|---|---|",
        *[f"| {x['csvLine']} | {x['productId']} | {x['attribute']} | {x['after']['status']} | {x['disposition']} |" for x in downgraded],
        "",
        "## Established values replaced or conflicts settled",
        "",
        "| Line | Product | Attribute | Before | After |",
        "|---|---|---|---|---|",
        *[f"| {x['csvLine']} | {x['productId']} | {x['attribute']} | {show(x['before'])} | {show(x['after'])} |" for x in replaced],
        "",
        "## Owner decisions applied during integration",
        "",
        *[f"- `{p}.{a}` → `{json.dumps(d['value'])}` ({d['decidedOn']}): {d['statement']}" for (p, a), d in OWNER_DECISIONS.items()],
        "",
    ]
    return "\n".join(lines)


def main(check: bool) -> int:
    manifest = json.loads(MANIFEST.read_text())
    hashes = {"research": sha256(RESEARCH_CSV), "ratings": sha256(RATINGS_CSV), "catalog": sha256(CATALOG),
              "baseline": manifest["baseline"]}
    if hashes["research"] != manifest["files"]["PUMPPATH_RESEARCH_FINAL.csv"]["sha256"]:
        raise ConversionError("research CSV hash does not match the manifest")
    if hashes["ratings"] != manifest["files"]["PUMPPATH_CONSUMER_RATINGS.csv"]["sha256"]:
        raise ConversionError("consumer ratings CSV hash does not match the manifest")

    rows = read_csv(RESEARCH_CSV)
    rating_rows = read_csv(RATINGS_CSV)
    catalog = json.loads(CATALOG.read_text())
    if catalog["schema"] != "pumppath.catalog-export/v2":
        raise ConversionError("catalog export is not v2; run npm run catalog:export")

    entries, notes, ledger = build(rows, catalog)
    if not len(ledger) == len(rows) == manifest["files"]["PUMPPATH_RESEARCH_FINAL.csv"]["rows"]:
        raise ConversionError("not every research row is accounted for")
    ratings = convert_ratings(rating_rows, {p["id"] for p in catalog["products"]})
    if len(ratings) != manifest["files"]["PUMPPATH_CONSUMER_RATINGS.csv"]["rows"]:
        raise ConversionError("not every ratings row is accounted for")

    package = {"id": PACKAGE, "baseline": manifest["baseline"], "researchSha256": hashes["research"],
               "ratingsSha256": hashes["ratings"], "catalogExportSha256": hashes["catalog"]}
    header = "// GENERATED by scripts/catalog/import_research.py from the PumpPath research package. Do not edit."
    outputs = {
        OUT_OVERLAY: ts_module(header, 'import type { ResearchOverlay } from "@/lib/products/research";',
                               "research20261112", "ResearchOverlay",
                               {"package": package, "entries": entries, "maintainerNotes": notes}),
        OUT_RATINGS: ts_module(header, 'import type { ConsumerRatingsPackage } from "@/lib/ratings/types";',
                               "consumerRatings20261112", "ConsumerRatingsPackage",
                               {"package": package, "ratings": ratings}),
        OUT_LEDGER: json.dumps({"package": package, "rows": ledger}, ensure_ascii=False, indent=1) + "\n",
        OUT_SUMMARY: summarize(rows, ledger, entries, notes, ratings, hashes),
    }
    stale = []
    for path, text in outputs.items():
        if check:
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
    if stale:
        print("stale or missing: " + ", ".join(stale), file=sys.stderr)
        return 1
    print(f"{len(ledger)} research rows ({len(entries)} attribute results, {len(notes)} notes, "
          f"{len(ledger) - len(entries) - len(notes)} unchanged); {len(ratings)} rating rows. "
          + ("Outputs are current." if check else "Written."))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main("--check" in sys.argv[1:]))
    except ConversionError as e:
        print(f"conversion error: {e}", file=sys.stderr)
        sys.exit(2)
