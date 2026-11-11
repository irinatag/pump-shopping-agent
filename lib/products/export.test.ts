import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { products, sources } from "@/lib/products";
import { buildCatalogExport } from "@/lib/products/export";

// docs/CATALOG_EXPORT.json must equal the catalog it was generated from.
// Regenerate: npm run catalog:export   (sets WRITE_CATALOG_EXPORT=1)

const FILE = fileURLToPath(new URL("../../docs/CATALOG_EXPORT.json", import.meta.url));
const FORBIDDEN_KEY = /price|cents|cost|shipping|stock|inventory|coverage|covered|insurance|eligib|copay|deductible|allowance|planId|offer|supplier/i;

const built = buildCatalogExport();
if (process.env.WRITE_CATALOG_EXPORT === "1") writeFileSync(FILE, JSON.stringify(built, null, 1) + "\n");

describe("catalog export", () => {
  it("exists and matches the current catalog exactly", () => {
    expect(existsSync(FILE), "run npm run catalog:export").toBe(true);
    expect(JSON.parse(readFileSync(FILE, "utf8"))).toEqual(JSON.parse(JSON.stringify(built)));
  });

  it("includes every product record and every source", () => {
    expect(built.products.map((p) => p.id)).toEqual(products.map((p) => p.id));
    expect(built.counts.products).toBe(products.length);
    expect(built.sources.map((s) => s.id)).toEqual(sources.map((s) => s.id));
    const slots = Object.values(built.counts.attributeStatus).reduce((a, b) => a + b, 0);
    expect(slots).toBe(products.length * built.counts.attributesPerProduct);
    expect(built.conflicts.length).toBe(built.counts.attributeStatus.conflicting);
  });

  it("carries no offer, price, shipping, stock or insurance fields", () => {
    const walk = (value: unknown, path: string) => {
      if (!value || typeof value !== "object") return;
      for (const [k, v] of Object.entries(value)) {
        expect(FORBIDDEN_KEY.test(k), `${path}.${k}`).toBe(false);
        if (k !== "quote" && k !== "note" && k !== "rationale" && k !== "description") walk(v, `${path}.${k}`);
      }
    };
    walk(built, "export");
  });
});
