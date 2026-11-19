// Domain A — product catalog. Real, source-backed pump models only.
// No prices, shipping, stock, or insurance coverage may live here.
// Attribute definitions and recording rules: docs/DATA.md.

export type SourceKind = "manufacturer-page" | "manufacturer-manual";

export interface Source {
  id: string;
  url: string;
  publisher: string;
  kind: SourceKind;
  /** YYYY-MM-DD the page was read and the quotes were checked against it. */
  accessedOn: string;
}

/** A verbatim excerpt from a source that supports a value. */
export interface SourceQuote {
  /** Omitted on hand-written catalog records; "source-quote" is the default. */
  kind?: "source-quote";
  sourceId: string;
  quote: string;
  /**
   * Whose claim this is. "this-product" (default): the page describes this model.
   * "brand-wide": a manufacturer statement covering all its pumps.
   * "other-product": a statement about this model made on another product's page.
   */
  scope?: "this-product" | "brand-wide" | "other-product";
  /** Where on the page. Default "product-content"; title/metadata are still the model's own page. */
  section?: "product-content" | "page-title" | "page-metadata";
}

/**
 * Who stands behind a researched value (research package `evidenceClass`).
 * "owner-verified": the PumpPath owner supplied and verified the value. A valid verification
 * pathway of its own: such values are `verified`, but never manufacturer-confirmed.
 */
export type ResearchEvidenceClass = "manufacturer" | "owner-verified" | "retailer-listing" | "derived-from-catalog";

/** Kind of site a cited link points to, from its host. Only "manufacturer" hosts are approved catalog sources. */
export type LinkSite =
  | "manufacturer"
  /** File or help-desk host serving a document (e.g. a CDN-hosted manual); publisher not implied by the host. */
  | "file-host"
  | "retailer"
  | "manual-mirror"
  | "press-release"
  | "forum-or-blog"
  | "regional-site";

/** One row of an imported research package, carried as provenance. Not a verbatim page quote. */
export interface ResearchEvidence {
  kind: "research";
  evidenceClass: ResearchEvidenceClass;
  /** Package id, e.g. "pumppath-research-2026-11-12", and the row's line in its CSV (header = line 1). */
  package: string;
  csvLine: number;
  /** The row's proposedValue exactly as recorded, including qualifiers and notes. */
  stated: string;
  /** evidenceSummary: the researcher's (or owner's) paraphrase. */
  summary: string;
  /** keyQuote (at most 14 words) when one was captured; quoteStatus says where it came from. */
  keyQuote?: string;
  quoteStatus: string;
  links: { url: string; site: LinkSite }[];
  /** Non-URL entries of the row's source column, verbatim (e.g. "owner-verified (no link)"). */
  sourceText?: string[];
  /** "High" | "Medium" | "Low" | "Owner-verified", as recorded. */
  confidence: string;
  limitations?: string;
}

/** A decision the owner made while integrating a package, recorded where it overrides a row. */
export interface OwnerDecision {
  kind: "owner-decision";
  decidedOn: string;
  statement: string;
  /** The package row this decision replaces, with the value that row proposed. */
  supersedes?: { package: string; csvLine: number; stated: string };
}

export type Evidence = SourceQuote | ResearchEvidence | OwnerDecision;

export const isSourceQuote = (e: Evidence): e is SourceQuote => e.kind === undefined || e.kind === "source-quote";

/** Why an attribute does not apply to a product (e.g. battery runtime of a manual pump). */
export type NotApplicableReason = "manual-pump" | "plug-in-only" | "plug-in-version" | "replaceable-batteries";

/** A conflict between manufacturer statements settled by an owner-approved rule (research rule R1). */
export interface RuleResolution<T> {
  basis: "weight-of-evidence" | "tie-conservative";
  /** The values not selected, with their evidence. Never dropped. */
  alternatives: { value: T; evidence: Evidence[] }[];
}

export type Attribute<T> =
  /** The evidence states the value directly (manufacturer quote, or owner verification). */
  | { status: "verified"; value: T; evidence: Evidence[] }
  /** The value follows from the evidence by a stated rule, but the source does not say it outright. */
  | { status: "inferred"; value: T; evidence: Evidence[]; rationale: string; ruleResolution?: RuleResolution<T> }
  | { status: "conflicting"; candidates: { value: T; evidence: Evidence }[]; note: string }
  /** The attribute does not apply to this product; distinct from unknown. */
  | { status: "not-applicable"; reason: NotApplicableReason; evidence: Evidence[] }
  | { status: "unknown"; note?: string };

/** How milk is collected, per configuration included in the box. */
export type CollectionType =
  /** Self-contained unit (motor + collector) worn inside the bra; no external unit. */
  | "in-bra-wearable"
  /** Collection cups worn in the bra, driven by an external motor or handle through tubing. */
  | "external-unit-with-in-bra-cups"
  /** Flanges held at the breast with bottles or containers below them. */
  | "flanges-and-bottles"
  /** Single-piece silicone collector using passive suction. */
  | "one-piece-silicone"
  /** No collection kit in the box; it is a separately sold product used with the pump. */
  | "kit-sold-separately";

/**
 * Modes the pump can operate in. "mains": it can pump while plugged into wall power (directly or
 * through its adapter). A charger that only recharges the battery is not "mains".
 */
export type PowerSource = "mains" | "built-in-battery" | "aa-batteries" | "battery-pack" | "none";

export type Portability = "carry-handle" | "clip-or-lanyard" | "pocket-or-bag-sized" | "cordless-operation";

export type HandsFree =
  /** Hands-free with what is in the box. */
  | "as-sold"
  /** Hands-free only with separately sold accessories (pumping bra, bustier, cups). */
  | "with-accessories"
  /** Not hands-free. */
  | "no";

/** Portable if the pump runs on any battery or is manual; stationary if it runs on mains only. */
export type PortabilityClass = "portable" | "stationary";

export type WeightScope =
  | "motor"
  | "kit"
  | "single-wearable-unit"
  | "per-cup"
  | "per-collector"
  | "pair"
  /** The pump put together for use, as published ("assembled product weight"). */
  | "assembled-pump"
  | "with-accessories"
  /** Overall or total product weight; may include more than the motor. */
  | "whole-product"
  | "unspecified";

export type WeightUnit = "g" | "kg" | "oz" | "lb";

export type Comparator =
  | "eq"
  /** "less than", "under", "<", "nearly". */
  | "lt"
  /** "up to", "≤", "max". */
  | "up-to"
  /** "over", "more than", "+". */
  | "at-least"
  /** "approximately", "about", "≈", "on average". */
  | "approximately";

export interface Measure<U extends string> {
  amount: number;
  unit: U;
  comparator: Comparator;
  /** Upper end when the source gives a range ("5-6 sessions"); `amount` is the lower end. */
  max?: number;
}

export interface Weight extends Measure<WeightUnit> {
  scope: WeightScope;
  /** Second unit of a compound figure ("2 lbs 13 oz" = 2 lb + 13 oz). */
  plus?: { amount: number; unit: WeightUnit };
  /** Further weights published alongside, each with its own scope ("plus 130 g per milk collector"). */
  components?: (Measure<WeightUnit> & { scope: WeightScope })[];
}

export interface Capacity extends Measure<"ml" | "oz"> {
  /** What the figure covers, when the source says. */
  scope?: "per-cup" | "per-container" | "per-collector";
}

export interface DishwasherSafety {
  /**
   * "dishwasher-safe-parts": the manufacturer allows the dishwasher for at least some parts.
   * "hand-wash-only": the manufacturer forbids the dishwasher or says it has not verified it.
   * Absent on records not yet re-checked against the research package.
   */
  label?: "dishwasher-safe-parts" | "hand-wash-only";
  /** "all" only when the source says all parts; "some" when it names parts or exclusions; "none" for hand-wash only. */
  parts: "all" | "some" | "unspecified" | "none";
  /** Which parts, and any conditions, as stated. */
  detail?: string;
  /**
   * Legacy rack flag of the hand-written records. Rack position is its own attribute
   * (`topRackOnly`); cycle rules are `cycleRestriction`.
   */
  topRackOnly?: boolean | null;
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  market: "US";
  /** Set when this record is a variant of another (e.g. with/without battery). */
  variantOf?: string;
  /**
   * Manufacturer sources this record was built from; the first is the model's own page.
   * A listed "manufacturer-manual" source is this model's own instructions for use.
   */
  sourceIds: string[];
  mechanism: Attribute<"electric" | "manual">;
  collection: Attribute<CollectionType[]>;
  multiUser: Attribute<boolean>;
  pumping: Attribute<"single" | "double" | "single-or-double">;
  powerSources: Attribute<PowerSource[]>;
  batteryLife: Attribute<Measure<"min">>;
  batterySessions: Attribute<Measure<"sessions">>;
  portability: Attribute<Portability[]>;
  weight: Attribute<Weight>;
  maxSuction: Attribute<Measure<"mmHg">>;
  suctionLevels: Attribute<string>;
  noise: Attribute<Measure<"dB">>;
  handsFree: Attribute<HandsFree>;
  closedSystem: Attribute<boolean>;
  dishwasherSafe: Attribute<DishwasherSafety>;
  cleaning: Attribute<string>;
  capacity: Attribute<Capacity>;
  includedItems: Attribute<string[]>;
  features: Attribute<string[]>;
  /** Derived class; separate from the `portability` trait list. */
  portabilityClass: Attribute<PortabilityClass>;
  /** Parts to clean, as stated ("3 parts per cup", "One-piece design"). */
  partsToClean: Attribute<string>;
  /** The manufacturer states a rack: dishwasher top rack only. */
  topRackOnly: Attribute<boolean>;
  /** Parts that must not be washed, as stated ("tubing; motor unit"). */
  notWashable: Attribute<string>;
  /** Parts (or "yes" for all) the manufacturer recommends washing by hand, as stated. */
  handWashRecommended: Attribute<string>;
  /** Dishwasher cycle rule, as stated ("sanitize cycle, no heat dry"). Separate from rack position. */
  cycleRestriction: Attribute<string>;
}

export type ProductAttributeKey = Exclude<keyof Product, "id" | "brand" | "model" | "market" | "variantOf" | "sourceIds">;

/** Category used by coverage rules. Derived from mechanism, collection and multiUser — never stored. */
export type PumpCategory = "flange-bottle-electric" | "hands-free-electric" | "wearable" | "manual" | "multi-user";
