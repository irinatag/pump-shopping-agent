import { describe, expect, it } from "vitest";
import { getProduct, products } from "@/lib/products";
import { listingObservations, realSuppliers, simulatedSuppliers, suppliers } from "@/lib/suppliers";
import { simulatedPlans } from "@/lib/offers/simulated/data";

describe("supplier catalog", () => {
  it("has 12 fictional simulated suppliers with unique ids", () => {
    expect(simulatedSuppliers).toHaveLength(12);
    expect(new Set(suppliers.map((s) => s.id)).size).toBe(suppliers.length);
    for (const s of simulatedSuppliers) expect(s.provenance).toBe("simulated");
  });

  it("keeps simulated supplier names distinct from real suppliers and pump brands", () => {
    const real = [...realSuppliers.map((s) => s.name), ...new Set(products.map((p) => p.brand))].map((n) => n.toLowerCase());
    for (const s of simulatedSuppliers) {
      for (const r of real) expect(s.name.toLowerCase().includes(r.split(" ")[0]), `${s.name} vs ${r}`).toBe(false);
    }
  });

  it("only places simulated suppliers in simulated plan networks", () => {
    const planIds = new Set(simulatedPlans.map((p) => p.id));
    for (const s of simulatedSuppliers) for (const id of s.inNetworkPlanIds) expect(planIds).toContain(id);
  });

  it("marks real suppliers as real and records why listings are or are not collected", () => {
    for (const s of realSuppliers) {
      expect(s.provenance).toBe("real");
      expect(new URL(s.website).protocol).toBe("https:");
    }
    const yummy = realSuppliers.find((s) => s.id === "yummy-mummy")!;
    expect(yummy.listings.status).toBe("not-collected");
  });
});

describe("listing observations", () => {
  it("reference real suppliers that permit collection, and existing products", () => {
    const collecting = new Set(realSuppliers.filter((s) => s.listings.status === "collected").map((s) => s.id));
    for (const l of listingObservations) {
      expect(collecting).toContain(l.supplierId);
      expect(() => getProduct(l.productId)).not.toThrow();
      expect(new URL(l.listingUrl).protocol).toBe("https:");
      expect(l.observedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("record presence only — no price, coverage, or stock fields", () => {
    for (const l of listingObservations) {
      for (const key of Object.keys(l)) expect(key).not.toMatch(/price|cents|cover|insur|stock|eligib/i);
    }
  });

  it("observe each product at most once per supplier", () => {
    const keys = listingObservations.map((l) => `${l.supplierId}/${l.productId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("quote the exact listing name when the evidence is the listing page", () => {
    for (const l of listingObservations) {
      if (l.evidence.kind === "listing-page") expect(l.evidence.quote).toBe(l.listingName);
    }
  });
});
