import { isSourceQuote, type Evidence, type SourceQuote } from "@/lib/products/types";

/** Verbatim page/manual quotes only (the evidence that saved-page checks can verify). */
export const sourceQuotes = (evidence: Evidence[]): SourceQuote[] => evidence.filter(isSourceQuote);

/**
 * The text an evidence item contributes to wording checks: a quote; a research row's stated value,
 * key quote and summary; or an owner decision's statement.
 */
export function evidenceTexts(e: Evidence): string[] {
  if (isSourceQuote(e)) return [e.quote];
  if (e.kind === "research") return [e.stated, e.keyQuote ?? "", e.summary].filter((t) => t.length > 0);
  return [e.statement];
}
