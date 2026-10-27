import { getPlan, getPump, suppliers } from "@/lib/catalog";
import { checkEligibility } from "@/lib/eligibility";
import { supplierPriceCents } from "@/lib/pricing";
import type { InsurancePlan, Pump, Quote, Supplier } from "@/lib/types";

export function quoteOffer(plan: InsurancePlan, supplier: Supplier, pump: Pump): Quote {
  const offering = supplier.offerings.find((o) => o.pumpId === pump.id);
  if (!offering) throw new Error(`${supplier.id} does not carry ${pump.id}`);

  const { status, reasons } = checkEligibility(plan, supplier, pump);
  const price = supplierPriceCents(supplier, pump);

  let insurancePaysCents = 0;
  let outOfPocketCents = price;
  if (status === "fully-covered") {
    insurancePaysCents = price;
    outOfPocketCents = 0;
  } else if (status === "upgrade") {
    insurancePaysCents = plan.allowanceCents;
    outOfPocketCents = price - plan.allowanceCents + supplier.upgradeHandlingFeeCents;
  }

  return {
    supplierId: supplier.id,
    pumpId: pump.id,
    status,
    reasons,
    supplierPriceCents: price,
    insurancePaysCents,
    outOfPocketCents,
    inStock: offering.inStock,
    shippingDays: supplier.shippingDays,
  };
}

/** Every supplier offering quoted against one plan, in catalog order. */
export function quotesForPlan(planId: string): Quote[] {
  const plan = getPlan(planId);
  return suppliers.flatMap((supplier) =>
    supplier.offerings.map((offering) => quoteOffer(plan, supplier, getPump(offering.pumpId))),
  );
}
