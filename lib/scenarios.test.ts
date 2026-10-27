import { describe, expect, it } from "vitest";
import { getPump } from "@/lib/catalog";
import { quotesForPlan } from "@/lib/quotes";
import { getScenario, scenarios } from "@/lib/scenarios";
import type { ScenarioId } from "@/lib/types";

function scenarioQuotes(id: ScenarioId) {
  const { planId, preferences } = getScenario(id);
  const quotes = quotesForPlan(planId);
  const isPreferred = (pumpId: string) => preferences.pumpTypes.includes(getPump(pumpId).type);
  return {
    all: quotes,
    preferred: quotes.filter((q) => isPreferred(q.pumpId)),
  };
}

describe("demo scenarios", () => {
  it("defines exactly A, B, E and H", () => {
    expect(scenarios.map((s) => s.id)).toEqual(["A", "B", "E", "H"]);
  });

  it("A: several in-stock double-electric pumps are fully covered", () => {
    const covered = scenarioQuotes("A").preferred.filter(
      (q) => q.status === "fully-covered" && q.inStock,
    );
    expect(covered).toHaveLength(9);
    expect(covered.every((q) => q.outOfPocketCents === 0)).toBe(true);
  });

  it("B: every in-network wearable is an upgrade, cheapest is $69.13", () => {
    const inNetwork = scenarioQuotes("B").preferred.filter(
      (q) => !q.reasons.includes("out-of-network"),
    );
    expect(inNetwork.length).toBeGreaterThan(0);
    expect(inNetwork.every((q) => q.status === "upgrade")).toBe(true);

    const cheapest = [...inNetwork].sort((a, b) => a.outOfPocketCents - b.outOfPocketCents)[0];
    expect(cheapest).toMatchObject({
      supplierId: "little-latch",
      pumpId: "kestrel-glide",
      outOfPocketCents: 6913,
    });
  });

  it("E: only two suppliers are in network, and one in-network pump is out of stock", () => {
    const { all, preferred } = scenarioQuotes("E");
    const inNetworkSuppliers = new Set(
      all.filter((q) => !q.reasons.includes("out-of-network")).map((q) => q.supplierId),
    );
    expect([...inNetworkSuppliers].sort()).toEqual(["anchor-medical", "harborside-dme"]);

    expect(preferred).toContainEqual(
      expect.objectContaining({ supplierId: "anchor-medical", pumpId: "lunaria-duo", inStock: false }),
    );
    expect(preferred).toContainEqual(
      expect.objectContaining({
        supplierId: "harborside-dme",
        pumpId: "lunaria-duo",
        status: "fully-covered",
        inStock: true,
      }),
    );
  });

  it("H: no wearable is covered, but $0 covered alternatives exist", () => {
    const { all, preferred } = scenarioQuotes("H");
    expect(preferred.length).toBeGreaterThan(0);
    expect(preferred.every((q) => q.status === "not-covered")).toBe(true);
    expect(preferred.every((q) => q.reasons.includes("pump-type-not-covered"))).toBe(true);

    const alternatives = all.filter(
      (q) =>
        q.status === "fully-covered" && q.inStock && getPump(q.pumpId).type === "double-electric",
    );
    expect(alternatives.length).toBeGreaterThan(0);
  });
});
