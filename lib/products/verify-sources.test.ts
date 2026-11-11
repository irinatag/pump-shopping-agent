import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { products, sources } from "@/lib/products";
import type { ProductAttributeKey } from "@/lib/products/types";
import { listingObservations } from "@/lib/suppliers";

// Opt-in checks against saved source pages:
//  - every quote appears verbatim in its source's product region (section check);
//  - supplier listing names / sitemap URLs appear in the saved listing pages;
//  - an attribute left unknown while its product region carries a strong signal must explain why.
// Snapshots should be product-region text from scripts/catalog/region.py (navigation, related
// products and reviews removed). Each .txt file's first line is "URL: <fetched url>".
// Run: SOURCE_SNAPSHOTS=/path/to/region npx vitest run lib/products/verify-sources.test.ts

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
        value.status === "verified" || value.status === "inferred"
          ? value.evidence
          : value.status === "conflicting"
            ? value.candidates.map((c: { evidence: unknown }) => c.evidence)
            : [];
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

  // Signals strong enough that an unknown value needs a recorded reason.
  const SIGNALS: Partial<Record<ProductAttributeKey, RegExp>> = {
    maxSuction: /\d{3}\s?mm\s?hg/i,
    noise: /\d{2}\s?-?(db|decibels?)\b/i,
    closedSystem: /closed[- ]system/i,
    dishwasherSafe: /dishwasher/i,
    batteryLife: /(battery (life|lasts)|lasts)[^.]{0,30}\d+(\.\d+)?\s?(h|hrs?|hours?|min|minutes?)\b/i,
  };

  const unknownWithSignal = products.flatMap((p) =>
    (Object.keys(SIGNALS) as ProductAttributeKey[]).flatMap((k) => {
      const a = p[k];
      return a.status === "unknown" ? [{ p, k, note: a.note }] : [];
    }),
  );

  it.each(unknownWithSignal.map((x) => [`${x.p.id}.${x.k}`, x] as const))("unknown %s is explained if the page signals a value", (_l, { p, k, note }) => {
    const text = textFor(sources.find((s) => s.id === p.sourceIds[0])!.url) ?? "";
    if (SIGNALS[k]!.test(text)) expect(note, `${p.id}.${k}: page has a ${k} signal but no note explains the unknown`).toBeTruthy();
  });
});
