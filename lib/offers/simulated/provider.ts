import { getProduct } from "@/lib/products";
import { simulatedSuppliers } from "@/lib/suppliers";
import type { SimulatedSupplier } from "@/lib/suppliers/types";
import {
  coverageOverrides,
  SIMULATED_SHIPPING_CENTS,
  simulatedOfferings,
  simulatedPlans,
  type SimulatedOffering,
  type SimulatedPlan,
} from "@/lib/offers/simulated/data";
import {
  SIMULATED_LABEL,
  type IneligibilityReason,
  type Quote,
  type QuoteProvider,
  type QuoteRequest,
  type QuoteResponse,
} from "@/lib/offers/types";

/** Pump cost the member would pay if eligible: override first, else list price above allowance. */
export function simulatedPumpCostCents(plan: SimulatedPlan, offering: SimulatedOffering): number {
  const override = coverageOverrides.find(
    (o) => o.planId === plan.id && o.supplierId === offering.supplierId && o.productId === offering.productId,
  );
  return override ? override.pumpOutOfPocketCents : Math.max(0, offering.listPriceCents - plan.allowanceCents);
}

/** Deterministic mock coverage decision. Pure; no network and no member data. */
export function simulateQuote(plan: SimulatedPlan, supplier: SimulatedSupplier, offering: SimulatedOffering, providerId: string): Quote {
  const category = getProduct(offering.productId).category;
  const reasons: IneligibilityReason[] = [];

  if (!supplier.inNetworkPlanIds.includes(plan.id)) reasons.push("out-of-network");
  if (category.status !== "verified") reasons.push("category-unverified");
  else if (!plan.coveredCategories.includes(category.value)) reasons.push("category-not-covered");

  const pumpCost = simulatedPumpCostCents(plan, offering);
  if (pumpCost > 0 && !plan.upgradesAllowed) reasons.push("upgrade-not-allowed");

  const status =
    reasons.includes("category-unverified") ? "unverified"
    : reasons.length > 0 ? "not-covered"
    : pumpCost > 0 ? "upgrade"
    : "fully-covered";

  const pumpOutOfPocketCents = status === "not-covered" ? offering.listPriceCents : status === "unverified" ? null : pumpCost;
  const total = pumpOutOfPocketCents === null ? null : pumpOutOfPocketCents + SIMULATED_SHIPPING_CENTS;

  return {
    provenance: { kind: "simulated", providerId, label: SIMULATED_LABEL },
    planId: plan.id,
    supplierId: supplier.id,
    productId: offering.productId,
    status,
    reasons,
    listPriceCents: offering.listPriceCents,
    insurancePaysCents: pumpOutOfPocketCents === null ? null : offering.listPriceCents - pumpOutOfPocketCents,
    charges: {
      pumpOutOfPocketCents,
      shippingCents: SIMULATED_SHIPPING_CENTS,
      otherMandatoryCents: 0,
      totalOutOfPocketCents: total,
    },
    inStock: offering.inStock,
    shippingDays: supplier.shippingDays,
  };
}

export interface SimulatedQuoteProviderOptions {
  /** Simulates the coverage check being unavailable for every plan. */
  failVerification?: boolean;
}

export class SimulatedQuoteProvider implements QuoteProvider {
  readonly id = "simulated";
  readonly provenance = "simulated" as const;

  constructor(private readonly options: SimulatedQuoteProviderOptions = {}) {}

  async getQuotes({ planId, productIds }: QuoteRequest): Promise<QuoteResponse> {
    const plan = simulatedPlans.find((p) => p.id === planId);
    if (!plan) return { status: "unknown_plan" };
    if (this.options.failVerification) return { status: "verification_failed", detail: "Simulated verification failure." };

    const quotes = simulatedSuppliers.flatMap((supplier) =>
      simulatedOfferings
        .filter((o) => o.supplierId === supplier.id && (!productIds || productIds.includes(o.productId)))
        .map((o) => simulateQuote(plan, supplier, o, this.id)),
    );
    return { status: "ok", quotes };
  }
}
