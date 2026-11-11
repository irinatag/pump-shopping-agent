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
export interface Evidence {
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

export type Attribute<T> =
  /** The quotes state the value directly. */
  | { status: "verified"; value: T; evidence: Evidence[] }
  /** The value follows from the quotes by a stated rule, but the source does not say it outright. */
  | { status: "inferred"; value: T; evidence: Evidence[]; rationale: string }
  | { status: "conflicting"; candidates: { value: T; evidence: Evidence }[]; note: string }
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
  | "one-piece-silicone";

/** Modes the pump can operate in. A charger for a rechargeable battery is not "mains". */
export type PowerSource = "mains" | "built-in-battery" | "aa-batteries" | "battery-pack" | "none";

export type Portability = "carry-handle" | "clip-or-lanyard" | "pocket-or-bag-sized" | "cordless-operation";

export type HandsFree =
  /** Hands-free with what is in the box. */
  | "as-sold"
  /** Hands-free only with separately sold accessories (pumping bra, bustier, cups). */
  | "with-accessories";

export type WeightScope = "motor" | "kit" | "single-wearable-unit" | "per-cup" | "pair" | "unspecified";

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
}

export interface Weight extends Measure<WeightUnit> {
  scope: WeightScope;
}

export interface DishwasherSafety {
  /** "all" only when the source says all parts; "some" when it names parts or exclusions. */
  parts: "all" | "some" | "unspecified";
  /** true when the source says top rack; null when it does not say. */
  topRackOnly: boolean | null;
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
  capacity: Attribute<Measure<"ml" | "oz">>;
  includedItems: Attribute<string[]>;
  features: Attribute<string[]>;
}

export type ProductAttributeKey = Exclude<keyof Product, "id" | "brand" | "model" | "market" | "variantOf" | "sourceIds">;

/** Category used by coverage rules. Derived from mechanism, collection and multiUser — never stored. */
export type PumpCategory = "flange-bottle-electric" | "hands-free-electric" | "wearable" | "manual" | "multi-user";
