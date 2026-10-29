// Domain B — supplier catalog: who the suppliers are and what they publicly list.
// A listing is never evidence that a pump is covered by any insurance plan.

export type SupplierProvenance = "real" | "simulated";

interface SupplierBase {
  id: string;
  name: string;
  provenance: SupplierProvenance;
}

export interface RealSupplier extends SupplierBase {
  provenance: "real";
  website: string;
  /** Whether PumpPath records this supplier's public listings, and why not if it doesn't. */
  listings: { status: "collected"; method: string } | { status: "not-collected"; reason: string };
}

/** Fictional supplier used only by the simulated quote provider. */
export interface SimulatedSupplier extends SupplierBase {
  provenance: "simulated";
  inNetworkPlanIds: string[];
  /** Business days from order to delivery (simulated). */
  shippingDays: number;
  /** 1.0–5.0 (simulated). */
  rating: number;
}

export type Supplier = RealSupplier | SimulatedSupplier;

/** A model seen on a real supplier's public page. Records presence only — no prices. */
export interface ListingObservation {
  supplierId: string;
  productId: string;
  /** Name as the supplier displays it. */
  listingName: string;
  listingUrl: string;
  observedOn: string;
  evidence:
    | { kind: "listing-page"; sourceUrl: string; quote: string }
    | { kind: "sitemap"; sourceUrl: string };
}
