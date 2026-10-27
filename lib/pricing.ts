import type { Pump, Supplier } from "@/lib/types";

export function supplierPriceCents(supplier: Supplier, pump: Pump): number {
  return Math.round((pump.retailPriceCents * (100 + supplier.priceAdjustmentPct)) / 100);
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}
