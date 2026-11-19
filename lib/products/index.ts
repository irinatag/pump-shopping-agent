import { amedaProducts, amedaSources } from "@/lib/products/data/ameda";
import { babyBuddhaProducts, babyBuddhaSources } from "@/lib/products/data/babybuddha";
import { eufyProducts, eufySources } from "@/lib/products/data/eufy";
import { evenfloProducts, evenfloSources } from "@/lib/products/data/evenflo";
import { lansinohProducts, lansinohSources } from "@/lib/products/data/lansinoh";
import { medelaProducts, medelaSources } from "@/lib/products/data/medela";
import { momcozyProducts, momcozySources } from "@/lib/products/data/momcozy";
import { motifProducts, motifSources } from "@/lib/products/data/motif";
import { spectraProducts, spectraSources } from "@/lib/products/data/spectra";
import { willowProducts, willowSources } from "@/lib/products/data/willow";
import { zomeeProducts, zomeeSources } from "@/lib/products/data/zomee";
import { research20261112 } from "@/lib/products/data/research-2026-11-12";
import { applyResearch, type MaintainerNote } from "@/lib/products/research";
import type { Product, Source } from "@/lib/products/types";

/** Hand-written catalog records, before any research package is applied. */
export const baseProducts: Product[] = [
  ...medelaProducts,
  ...spectraProducts,
  ...motifProducts,
  ...lansinohProducts,
  ...momcozyProducts,
  ...willowProducts,
  ...amedaProducts,
  ...zomeeProducts,
  ...babyBuddhaProducts,
  ...evenfloProducts,
  ...eufyProducts,
];

/**
 * The catalog: hand-written records with the 2026-11-12 research package applied. Package values,
 * inferred ones included, are the working values (docs/DATA.md, working-values policy).
 */
export const products: Product[] = applyResearch(baseProducts, research20261112);

/** Research notes for maintainers; kept beside products, never as attribute values. */
export const maintainerNotes: MaintainerNote[] = research20261112.maintainerNotes;

export const sources: Source[] = [
  ...medelaSources,
  ...spectraSources,
  ...motifSources,
  ...lansinohSources,
  ...momcozySources,
  ...willowSources,
  ...amedaSources,
  ...zomeeSources,
  ...babyBuddhaSources,
  ...evenfloSources,
  ...eufySources,
];

export function getProduct(id: string): Product {
  const found = products.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown product: ${id}`);
  return found;
}

export function getSource(id: string): Source {
  const found = sources.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown source: ${id}`);
  return found;
}
