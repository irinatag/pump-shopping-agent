// Domain A — product catalog. Real, source-backed pump models only.
// No prices, shipping, stock, or insurance coverage may live here.

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
}

export type Attribute<T> =
  | { status: "verified"; value: T; evidence: Evidence[] }
  | { status: "conflicting"; candidates: { value: T; evidence: Evidence }[]; note: string }
  | { status: "unknown"; note?: string };

export type PumpCategory =
  /** Tabletop or bag-style electric pump with tubing and bottles. */
  | "traditional-electric"
  /** Small handheld or clip-on electric motor with tubing and bottles. */
  | "portable-electric"
  /** Separate motor unit driving in-bra collection cups through tubing. */
  | "hands-free-electric"
  /** Self-contained motor and collection cup worn in the bra. */
  | "wearable"
  | "manual"
  /** Multi-user pump, typically rented. */
  | "multi-user";

export type PowerOption = "ac-adapter" | "built-in-battery" | "aa-batteries" | "battery-pack" | "none";

export type WeightUnit = "g" | "kg" | "oz" | "lb";

export interface Weight {
  amount: number;
  unit: WeightUnit;
  /** "lt" for statements such as "less than 2 pounds". */
  comparator: "eq" | "lt";
  /** What was weighed, as the source describes it. */
  scope: "pump" | "motor" | "per-unit" | "per-cup" | "system";
}

export interface Measure<U extends string> {
  amount: number;
  unit: U;
  /** "lt" = less than, "up-to" = at most, "at-least" = this much or more (e.g. "over 2 hours"). */
  comparator: "eq" | "lt" | "up-to" | "at-least";
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  market: "US";
  /** Set when this record is a variant of another (e.g. with/without battery). */
  variantOf?: string;
  /** Manufacturer pages this record was built from. */
  sourceIds: string[];
  category: Attribute<PumpCategory>;
  pumping: Attribute<"single" | "double" | "single-or-double">;
  power: Attribute<PowerOption[]>;
  batteryLife: Attribute<Measure<"min">>;
  weight: Attribute<Weight>;
  maxSuction: Attribute<Measure<"mmHg">>;
  suctionLevels: Attribute<string>;
  noise: Attribute<Measure<"dB">>;
  handsFree: Attribute<boolean>;
  closedSystem: Attribute<boolean>;
  dishwasherSafe: Attribute<boolean>;
  cleaning: Attribute<string>;
  capacity: Attribute<Measure<"ml" | "oz">>;
  includedItems: Attribute<string[]>;
  features: Attribute<string[]>;
}

export type ProductAttributeKey = Exclude<keyof Product, "id" | "brand" | "model" | "market" | "variantOf" | "sourceIds">;
