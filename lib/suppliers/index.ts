import { listingObservations, realSuppliers } from "@/lib/suppliers/real";
import { simulatedSuppliers } from "@/lib/suppliers/simulated";
import type { SimulatedSupplier, Supplier } from "@/lib/suppliers/types";

export const suppliers: Supplier[] = [...realSuppliers, ...simulatedSuppliers];

export { listingObservations, realSuppliers, simulatedSuppliers };

export function getSupplier(id: string): Supplier {
  const found = suppliers.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown supplier: ${id}`);
  return found;
}

export function getSimulatedSupplier(id: string): SimulatedSupplier {
  const found = simulatedSuppliers.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown simulated supplier: ${id}`);
  return found;
}
