import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { products, sources } from "@/lib/products";
import { listingObservations } from "@/lib/suppliers";

// Opt-in check that every quote appears verbatim in a saved copy of its source page.
// Also checks supplier listing observations against saved listing pages and sitemaps.
// Run: SOURCE_SNAPSHOTS=/path/to/pages npx vitest run lib/products/verify-sources.test.ts
// Each snapshot is a .txt file whose first line is "URL: <fetched url>".

const dir = process.env.SOURCE_SNAPSHOTS;

/** Whitespace, zero-width characters and typographic quotes vary between renderings; wording must not. */
export function normalize(text: string): string {
  return text
    .replace(/[​‌‍﻿]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function loadSnapshots(path: string): { url: string; text: string }[] {
  return readdirSync(path)
    .filter((f) => f.endsWith(".txt"))
    .map((f) => {
      const raw = readFileSync(join(path, f), "utf8");
      const [first, ...rest] = raw.split("\n");
      return { url: first.replace(/^URL:\s*/, "").trim(), text: normalize(rest.join("\n")) };
    });
}

describe.skipIf(!dir)("source quotes match saved pages", () => {
  const snapshots = dir ? loadSnapshots(dir) : [];
  const textFor = (url: string) =>
    snapshots.find((s) => s.url === url || s.url.startsWith(`${url}?`) || s.url.startsWith(`${url}/`))?.text;

  it.each(sources.map((s) => [s.id, s] as const))("%s has a saved snapshot", (_id, source) => {
    expect(textFor(source.url), source.url).toBeDefined();
  });

  const quotes = products.flatMap((p) =>
    Object.entries(p).flatMap(([attribute, value]) => {
      if (!value || typeof value !== "object" || !("status" in value)) return [];
      const evidence =
        value.status === "verified" ? value.evidence : value.status === "conflicting" ? value.candidates.map((c: { evidence: unknown }) => c.evidence) : [];
      return (evidence as { sourceId: string; quote: string }[]).map((e) => ({ product: p.id, attribute, ...e }));
    }),
  );

  it.each(quotes.map((q) => [`${q.product}.${q.attribute}: ${q.quote.slice(0, 50)}`, q] as const))(
    "%s",
    (_label, q) => {
      const source = sources.find((s) => s.id === q.sourceId);
      expect(source, q.sourceId).toBeDefined();
      const text = textFor(source!.url);
      expect(text, source!.url).toBeDefined();
      expect(text!.includes(normalize(q.quote)), `"${q.quote}" not found in ${source!.url}`).toBe(true);
    },
  );

  it.each(listingObservations.map((l) => [`${l.supplierId}/${l.productId}`, l] as const))("listing %s", (_label, l) => {
    const text = textFor(l.evidence.sourceUrl);
    expect(text, l.evidence.sourceUrl).toBeDefined();
    // Sitemap URLs must match exactly: bundle URLs often extend a model's URL.
    const found =
      l.evidence.kind === "listing-page"
        ? text!.includes(normalize(l.evidence.quote))
        : text!.split(" ").includes(l.listingUrl);
    expect(found, `${l.listingName} not in ${l.evidence.sourceUrl}`).toBe(true);
  });
});
