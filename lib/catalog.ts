import { plans } from "@/lib/data/plans";
import { pumps } from "@/lib/data/pumps";
import { suppliers } from "@/lib/data/suppliers";
import type { InsurancePlan, Pump, Supplier } from "@/lib/types";

function findOrThrow<T extends { id: string }>(items: T[], id: string, kind: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown ${kind}: ${id}`);
  return item;
}

export const getPump = (id: string): Pump => findOrThrow(pumps, id, "pump");
export const getPlan = (id: string): InsurancePlan => findOrThrow(plans, id, "plan");
export const getSupplier = (id: string): Supplier => findOrThrow(suppliers, id, "supplier");

export { plans, pumps, suppliers };
