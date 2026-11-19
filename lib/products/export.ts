import { products, sources } from "@/lib/products";
import { ATTRIBUTE_KEYS } from "@/lib/products/build";
import { classifyProduct, type Classification } from "@/lib/products/classification";
import { isSourceQuote, type Attribute, type Evidence, type NotApplicableReason, type OwnerDecision, type ProductAttributeKey, type ResearchEvidence, type Source, type SourceQuote } from "@/lib/products/types";

// Machine-readable export of the canonical product catalog (docs/CATALOG_EXPORT.json).
// Product domain only: no offers, prices, shipping, stock, plans or insurance data.
// Regenerate with `npm run catalog:export`; lib/products/export.test.ts fails if the file is stale.

export const CATALOG_EXPORT_SCHEMA = "pumppath.catalog-export/v2";

/** Every evidence item carries an explicit kind; source quotes have their scope/section defaults written out. */
type ExportedEvidence = Required<SourceQuote> | ResearchEvidence | OwnerDecision;

type ExportedAttribute =
  | { status: "verified"; value: unknown; evidence: ExportedEvidence[] }
  | {
      status: "inferred";
      value: unknown;
      rationale: string;
      evidence: ExportedEvidence[];
      ruleResolution: { basis: string; alternatives: { value: unknown; evidence: ExportedEvidence[] }[] } | null;
    }
  | { status: "conflicting"; note: string; candidates: { value: unknown; evidence: ExportedEvidence }[] }
  | { status: "not-applicable"; reason: NotApplicableReason; evidence: ExportedEvidence[] }
  | { status: "unknown"; note: string | null };

export interface CatalogExport {
  schema: typeof CATALOG_EXPORT_SCHEMA;
  description: string;
  counts: {
    products: number;
    baseModels: number;
    variants: number;
    brands: number;
    sources: number;
    attributesPerProduct: number;
    attributeStatus: Record<Attribute<unknown>["status"], number>;
    conflicts: number;
  };
  sources: Source[];
  products: {
    id: string;
    brand: string;
    model: string;
    market: "US";
    variantOf: string | null;
    sourceIds: string[];
    /** PumpPath classification derived from the attributes; not stored, not a manufacturer claim. */
    derivedClassification: Classification;
    attributes: Record<ProductAttributeKey, ExportedAttribute>;
  }[];
  conflicts: { productId: string; attribute: ProductAttributeKey; note: string; candidates: { value: unknown; evidence: ExportedEvidence }[] }[];
}

const ev = (e: Evidence): ExportedEvidence =>
  isSourceQuote(e)
    ? { kind: "source-quote", sourceId: e.sourceId, quote: e.quote, scope: e.scope ?? "this-product", section: e.section ?? "product-content" }
    : e;

export function exportAttribute(a: Attribute<unknown>): ExportedAttribute {
  switch (a.status) {
    case "verified":
      return { status: "verified", value: a.value, evidence: a.evidence.map(ev) };
    case "inferred":
      return {
        status: "inferred",
        value: a.value,
        rationale: a.rationale,
        evidence: a.evidence.map(ev),
        ruleResolution: a.ruleResolution
          ? { basis: a.ruleResolution.basis, alternatives: a.ruleResolution.alternatives.map((x) => ({ value: x.value, evidence: x.evidence.map(ev) })) }
          : null,
      };
    case "conflicting":
      return { status: "conflicting", note: a.note, candidates: a.candidates.map((c) => ({ value: c.value, evidence: ev(c.evidence) })) };
    case "not-applicable":
      return { status: "not-applicable", reason: a.reason, evidence: a.evidence.map(ev) };
    case "unknown":
      return { status: "unknown", note: a.note ?? null };
  }
}

export function buildCatalogExport(): CatalogExport {
  const status = { verified: 0, inferred: 0, conflicting: 0, "not-applicable": 0, unknown: 0 };
  const conflicts: CatalogExport["conflicts"] = [];
  const exported = products.map((p) => {
    const attributes = {} as Record<ProductAttributeKey, ExportedAttribute>;
    for (const k of ATTRIBUTE_KEYS) {
      const a = exportAttribute(p[k] as Attribute<unknown>);
      attributes[k] = a;
      status[a.status]++;
      if (a.status === "conflicting") conflicts.push({ productId: p.id, attribute: k, note: a.note, candidates: a.candidates });
    }
    return {
      id: p.id,
      brand: p.brand,
      model: p.model,
      market: p.market,
      variantOf: p.variantOf ?? null,
      sourceIds: p.sourceIds,
      derivedClassification: classifyProduct(p),
      attributes,
    };
  });
  return {
    schema: CATALOG_EXPORT_SCHEMA,
    description:
      "Canonical PumpPath product catalog generated from lib/products. Product facts only: no offers, prices, shipping, stock, plans or insurance coverage. Evidence scope/section defaults are written out explicitly. Definitions: docs/DATA.md.",
    counts: {
      products: products.length,
      baseModels: products.filter((p) => !p.variantOf).length,
      variants: products.filter((p) => p.variantOf).length,
      brands: new Set(products.map((p) => p.brand)).size,
      sources: sources.length,
      attributesPerProduct: ATTRIBUTE_KEYS.length,
      attributeStatus: status,
      conflicts: conflicts.length,
    },
    sources,
    products: exported,
    conflicts,
  };
}
