import type { Attribute, Product, ProductAttributeKey, PumpCategory } from "@/lib/products/types";

// Derives the coverage category from evidence-backed attributes. The result is a
// PumpPath classification, not a manufacturer statement, and records its basis.

export type Classification =
  | { status: "derived"; category: PumpCategory; basis: ProductAttributeKey[]; usesInferred: boolean }
  | { status: "unclassified"; reason: string };

const known = <T>(a: Attribute<T>): a is Extract<Attribute<T>, { value: T }> => a.status === "verified" || a.status === "inferred";

/**
 * Rules, in order:
 * 1. multiUser = true                                  → multi-user
 * 2. mechanism = manual                                → manual
 * 3. electric + collection includes in-bra-wearable    → wearable
 * 4. electric + external-unit-with-in-bra-cups         → hands-free-electric
 * 5. electric + flanges-and-bottles                    → flange-bottle-electric
 * When several configurations are in the box, the most hands-free one wins.
 */
export function classifyProduct(p: Product): Classification {
  if (known(p.multiUser) && p.multiUser.value) {
    return { status: "derived", category: "multi-user", basis: ["multiUser"], usesInferred: p.multiUser.status === "inferred" };
  }
  if (!known(p.mechanism)) return { status: "unclassified", reason: "Pump mechanism is not established." };
  if (p.mechanism.value === "manual") {
    return { status: "derived", category: "manual", basis: ["mechanism"], usesInferred: p.mechanism.status === "inferred" };
  }
  if (!known(p.collection)) return { status: "unclassified", reason: "Collection configuration is not established." };

  const c = p.collection.value;
  const category: PumpCategory | null = c.includes("in-bra-wearable")
    ? "wearable"
    : c.includes("external-unit-with-in-bra-cups")
      ? "hands-free-electric"
      : c.includes("flanges-and-bottles")
        ? "flange-bottle-electric"
        : null;
  if (!category) return { status: "unclassified", reason: "Collection configuration does not map to an electric category." };
  return {
    status: "derived",
    category,
    basis: ["mechanism", "collection"],
    usesInferred: p.mechanism.status === "inferred" || p.collection.status === "inferred",
  };
}
