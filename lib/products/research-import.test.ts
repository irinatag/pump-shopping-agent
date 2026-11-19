import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { baseProducts, products } from "@/lib/products";
import { research20261112 as overlay } from "@/lib/products/data/research-2026-11-12";
import { exportAttribute } from "@/lib/products/export";
import { applyResearch } from "@/lib/products/research";
import type { Attribute, DishwasherSafety, Product, Weight } from "@/lib/products/types";
import { consumerRatings20261112 as ratings } from "@/lib/ratings/consumer-ratings-2026-11-12";

// Dry-run checks for the 2026-11-12 research package (scripts/catalog/import_research.py).
// The overlay is applied in lib/products/index.ts; these tests check it against the package and
// against the hand-written catalog it was built on (baseProducts).

const doc = (name: string) => fileURLToPath(new URL(`../../docs/${name}`, import.meta.url));
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const manifest = JSON.parse(readFileSync(doc("PUMPPATH_PACKAGE_MANIFEST.json"), "utf8"));
const ledger: {
  package: typeof overlay.package;
  rows: { csvLine: number; productId: string; attribute: string; action: string; evidenceClass: string; proposedStatus: string; disposition: string; before?: unknown; after?: unknown }[];
} = JSON.parse(readFileSync(doc("research-import/LEDGER.json"), "utf8"));

const ACTION_DISPOSITIONS: Record<string, string[]> = {
  Update: ["update", "owner-decision"],
  "Add new attribute": ["add"],
  "Confirm (no value change)": ["confirm"],
  "Out of scope (owner decision)": ["unchanged-out-of-scope"],
  "Catalog value kept, not re-checked (owner decision)": ["unchanged-retained"],
  "Update (conflict resolved by owner rule; both values kept in limitations)": ["rule-resolved"],
  "Note for maintainers (not an attribute update)": ["maintainer-note"],
};
const entry = (productId: string, attribute: string) => overlay.entries.find((e) => e.productId === productId && e.attribute === attribute);
const result = <T,>(productId: string, attribute: keyof Product) => entry(productId, attribute)?.result as Attribute<T> | undefined;

describe("research package integrity", () => {
  it("reads the package files whose hashes the manifest records, and records them in every output", () => {
    const research = sha256(doc("PUMPPATH_RESEARCH_FINAL.csv"));
    const consumer = sha256(doc("PUMPPATH_CONSUMER_RATINGS.csv"));
    expect(research).toBe(manifest.files["PUMPPATH_RESEARCH_FINAL.csv"].sha256);
    expect(consumer).toBe(manifest.files["PUMPPATH_CONSUMER_RATINGS.csv"].sha256);
    for (const pkg of [overlay.package, ratings.package, ledger.package]) {
      expect(pkg).toMatchObject({ id: "pumppath-research-2026-11-12", baseline: manifest.baseline, researchSha256: research, ratingsSha256: consumer });
    }
  });

  it("accounts for every research row exactly once, by its action", () => {
    expect(ledger.rows).toHaveLength(manifest.files["PUMPPATH_RESEARCH_FINAL.csv"].rows);
    expect(ledger.rows.map((r) => r.csvLine)).toEqual(ledger.rows.map((_, i) => i + 2));
    const byAction: Record<string, number> = {};
    for (const r of ledger.rows) {
      byAction[r.action] = (byAction[r.action] ?? 0) + 1;
      expect(ACTION_DISPOSITIONS[r.action], `line ${r.csvLine}`).toContain(r.disposition);
    }
    expect(byAction).toEqual(manifest.files["PUMPPATH_RESEARCH_FINAL.csv"].byAction);
    const applied = ledger.rows.filter((r) => "after" in r).map((r) => r.csvLine);
    expect(overlay.entries.map((e) => e.csvLine)).toEqual(applied);
    expect(overlay.maintainerNotes).toHaveLength(byAction["Note for maintainers (not an attribute update)"]);
  });

  it("took its before-values from the hand-written catalog, frozen in BASELINE_CATALOG.json", () => {
    expect(sha256(doc("research-import/BASELINE_CATALOG.json"))).toBe(overlay.package.catalogExportSha256);
    for (const r of ledger.rows.filter((x) => "before" in x)) {
      const p = baseProducts.find((x) => x.id === r.productId)!;
      const key = (entry(r.productId, r.attribute.replace("cleaningRestrictions.", ""))?.attribute ?? r.attribute) as keyof Product;
      expect(r.before, `line ${r.csvLine}`).toEqual(JSON.parse(JSON.stringify(exportAttribute(p[key] as Attribute<unknown>))));
    }
  });

  it("converts every consumer-ratings row, in catalog order, with the manifest's rating counts", () => {
    expect(ratings.ratings.map((r) => r.productId)).toEqual(products.map((p) => p.id));
    const count = (k: "noiseRating" | "cleaningRating" | "dishwasherSafety_manufacturerFact") =>
      ratings.ratings.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r[k]]: (acc[r[k]] ?? 0) + 1 }), {});
    const m = manifest.files["PUMPPATH_CONSUMER_RATINGS.csv"];
    expect(count("noiseRating")).toEqual(m.noise);
    expect(count("cleaningRating")).toEqual(m.cleaning);
    expect(count("dishwasherSafety_manufacturerFact")).toEqual(m.dishwasher);
  });
});

describe("owner decisions and provenance", () => {
  const ownerRows = ledger.rows.filter((r) => r.evidenceClass === "Owner-verified fact");

  it("keeps all 56 owner-verified rows verified, with owner provenance, and the 2 owner notes as notes", () => {
    expect(ownerRows).toHaveLength(56);
    const notes = ownerRows.filter((r) => r.disposition === "maintainer-note");
    expect(notes).toHaveLength(2);
    for (const r of ownerRows.filter((x) => x.disposition !== "maintainer-note")) {
      const e = overlay.entries.find((x) => x.csvLine === r.csvLine)!;
      expect(e.result.status, `line ${r.csvLine}`).toBe("verified");
      if (e.result.status !== "verified") continue;
      const owner = e.result.evidence.filter((x) => x.kind === "research" && x.evidenceClass === "owner-verified");
      expect(owner.length, `line ${r.csvLine}`).toBeGreaterThan(0);
      for (const x of owner) if (x.kind === "research") expect(x.confidence).toBe("Owner-verified");
    }
    for (const r of notes) {
      const n = overlay.maintainerNotes.find((x) => x.evidence.csvLine === r.csvLine)!;
      expect(n.evidence).toMatchObject({ evidenceClass: "owner-verified", confidence: "Owner-verified" });
    }
  });

  it("imports the eight rule-resolved conflicts as inferred, with the selected value, alternatives and rule basis", () => {
    const rule = overlay.entries.filter((e) => e.change === "rule-resolved");
    expect(rule).toHaveLength(8);
    for (const e of rule) {
      const a = e.result as Attribute<unknown>;
      expect(a.status, `${e.productId}.${e.attribute}`).toBe("inferred");
      if (a.status !== "inferred") continue;
      expect(a.ruleResolution, `${e.productId}.${e.attribute}`).toBeDefined();
      expect(["weight-of-evidence", "tie-conservative"]).toContain(a.ruleResolution!.basis);
      expect(a.rationale).toMatch(/owner-approved rule/);
      for (const alt of a.ruleResolution!.alternatives) {
        expect(alt.value).not.toEqual(a.value);
        expect(alt.evidence.length).toBeGreaterThan(0);
      }
      // A rule decision is not owner verification of the conflicting claims.
      expect(a.evidence.some((x) => x.kind === "research" && x.evidenceClass === "owner-verified")).toBe(false);
    }
    expect((result("momcozy-s9-pro", "noise") as { ruleResolution?: { basis: string } }).ruleResolution?.basis).toBe("tie-conservative");
  });

  it("records Willow Wave as not hands-free by owner decision, superseding the derived row", () => {
    const h = result<string>("willow-wave", "handsFree")!;
    expect(h.status).toBe("verified");
    if (h.status !== "verified") return;
    expect(h.value).toBe("no");
    expect(h.evidence[0]).toMatchObject({ kind: "owner-decision", decidedOn: "2026-11-13", supersedes: { csvLine: 751, stated: "true" } });
  });

  it("keeps maintainer notes out of attribute values", () => {
    const noteLines = new Set(overlay.maintainerNotes.map((n) => n.evidence.csvLine));
    expect(overlay.entries.some((e) => noteLines.has(e.csvLine))).toBe(false);
    expect(overlay.entries.some((e) => (e.attribute as string) === "identityNote")).toBe(false);
  });

  it("leaves out-of-scope and retained rows' attributes untouched", () => {
    for (const r of ledger.rows.filter((x) => x.disposition.startsWith("unchanged-"))) {
      expect(entry(r.productId, r.attribute), `line ${r.csvLine}`).toBeUndefined();
    }
  });
});

describe("conversion keeps qualifiers, scope and separations", () => {
  it("keeps every research row's proposed value verbatim in its evidence", () => {
    for (const e of overlay.entries) {
      const a = e.result as Attribute<unknown>;
      const ev = a.status === "unknown" ? [] : a.status === "conflicting" ? a.candidates.map((c) => c.evidence) : a.evidence;
      const row = ev.find((x) => x.kind === "research" && x.csvLine === e.csvLine) ?? ev.find((x) => x.kind === "owner-decision");
      expect(row, `${e.productId}.${e.attribute}`).toBeDefined();
    }
  });

  it("keeps the eight weights without a stated scope unspecified", () => {
    const unscoped = ledger.rows.filter((r) => r.attribute === "weight" && /scope not stated/.test(JSON.stringify(r.after)));
    expect(unscoped).toHaveLength(8);
    for (const r of unscoped) expect((result<Weight>(r.productId, "weight") as { value: Weight }).value.scope).toBe("unspecified");
  });

  it("keeps charging separate from plugged-in pumping", () => {
    expect(result("zomee-mothers-nature-h1", "powerSources")).toMatchObject({ status: "inferred", value: ["built-in-battery"] });
    for (const id of ["medela-freestyle-mini-hands-free", "medela-melody-inbra", "medela-motion-inbra", "motif-aura-glow", "momcozy-m6-mobile-style"]) {
      expect((result<string[]>(id, "powerSources") as { value: string[] }).value, id).toEqual(["built-in-battery"]);
    }
  });

  it("keeps rack position separate from cycle restrictions and out of the dishwasher value", () => {
    for (const e of overlay.entries.filter((x) => x.attribute === "dishwasherSafe")) {
      const a = e.result as Attribute<DishwasherSafety>;
      if (a.status === "verified" || a.status === "inferred") {
        expect(a.value, e.productId).not.toHaveProperty("topRackOnly");
        expect(["dishwasher-safe-parts", "hand-wash-only"]).toContain(a.value.label);
        if (a.value.label === "hand-wash-only") expect(a.value.parts).toBe("none");
      }
    }
    const cycle = overlay.entries.filter((x) => x.attribute === "cycleRestriction").map((x) => x.productId);
    expect(cycle).toHaveLength(7);
    for (const id of cycle) expect(entry(id, "topRackOnly"), id).toBeUndefined();
  });

  it("leaves no legacy rack flag inside dishwasherSafe once applied: rack position lives only in topRackOnly", () => {
    for (const p of products) {
      const d = p.dishwasherSafe;
      if (d.status === "verified" || d.status === "inferred") expect(d.value, p.id).not.toHaveProperty("topRackOnly");
    }
  });

  it("does not show a rejected value's quote as the key quote of the value a rule selected", () => {
    for (const e of overlay.entries) {
      const a = e.result as Attribute<unknown>;
      if (a.status !== "inferred" || !a.ruleResolution) continue;
      const rejected = new Set(a.ruleResolution.alternatives.flatMap((x) => x.evidence.flatMap((ev) => ("quote" in ev ? [ev.quote] : []))));
      for (const ev of a.evidence) if (ev.kind === "research" && ev.keyQuote) expect(rejected.has(ev.keyQuote), `${e.productId}.${e.attribute}`).toBe(false);
    }
    const sonata = result<Weight>("medela-sonata", "weight");
    expect(sonata).toMatchObject({ status: "inferred", value: { amount: 1.1, unit: "kg" } });
  });

  it("keeps the consumer file's dishwasher labels equal to, and subordinate to, the catalog value", () => {
    for (const r of ratings.ratings) {
      const d = result<DishwasherSafety>(r.productId, "dishwasherSafe") as { value: DishwasherSafety };
      const label = d.value.label === "dishwasher-safe-parts" ? "Dishwasher-safe parts" : "Hand-wash only";
      expect(r.dishwasherSafety_manufacturerFact, r.productId).toBe(label);
    }
  });

  it("applies not-applicable only with a reason, never as unknown", () => {
    const na = overlay.entries.filter((e) => e.result.status === "not-applicable");
    expect(na).toHaveLength(48);
    for (const e of na) if (e.result.status === "not-applicable") expect(e.result.reason).toBeTruthy();
  });

  it("carries no duplicate evidence within an attribute", () => {
    for (const e of overlay.entries) {
      const a = e.result as Attribute<unknown>;
      if (a.status !== "verified" && a.status !== "inferred") continue;
      const keys = a.evidence.map((x) => JSON.stringify(x));
      expect(new Set(keys).size, `${e.productId}.${e.attribute}`).toBe(keys.length);
    }
  });
});

describe("applying the overlay", () => {
  it("is idempotent and does not mutate the hand-written records", () => {
    const before = JSON.stringify(baseProducts);
    const once = applyResearch(baseProducts, overlay);
    const twice = applyResearch(once, overlay);
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    expect(JSON.stringify(baseProducts)).toBe(before);
    for (const e of overlay.entries) expect(once.find((p) => p.id === e.productId)![e.attribute]).toEqual(e.result);
  });

  it("is what the catalog serves", () => {
    expect(JSON.stringify(products)).toBe(JSON.stringify(applyResearch(baseProducts, overlay)));
  });
});
