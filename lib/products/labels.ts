import { isSourceQuote, type Attribute, type Evidence, type NotApplicableReason } from "@/lib/products/types";

// Provenance labels: one per attribute, saying who stands behind the value and how it must be
// presented. Used by grounding (lib/grounding.ts) and, later, the UI. Rules: docs/DATA.md and the
// research package report (R1 conflicts, R2 trust levels, R4 not-applicable wording).

export type FactLabelKind =
  /** Verified by manufacturer evidence only (page or manual quote, or a manufacturer research row). */
  | "manufacturer-verified"
  /** Verified by the PumpPath owner (owner-verified research row or owner decision). Never manufacturer-confirmed. */
  | "owner-verified"
  /** Manufacturer statements disagree; the owner-approved rule (R1) chose a value. Other values are kept. */
  | "rule-resolved"
  /** From a retailer or supplier listing, not the manufacturer (weight only, low confidence). */
  | "retailer-listed"
  /** Computed by PumpPath from other catalog facts (e.g. portability class, hands-free). */
  | "derived"
  /** Follows from manufacturer evidence by a stated rationale, but is not stated outright. */
  | "interpreted"
  | "not-applicable"
  | "conflicting"
  | "unknown";

export interface FactLabel {
  kind: FactLabelKind;
  /** Short text for users and Claude, e.g. "Verified by PumpPath, not a manufacturer statement". */
  text: string;
}

export const NOT_APPLICABLE_TEXT: Record<NotApplicableReason, string> = {
  "manual-pump": "Not applicable (manual pump)",
  "plug-in-only": "Not applicable (plug-in only, no battery)",
  "plug-in-version": "Not applicable (plug-in version, no battery)",
  "replaceable-batteries": "Not applicable (runs on replaceable batteries)",
};

const TEXT: Record<Exclude<FactLabelKind, "not-applicable">, string> = {
  "manufacturer-verified": "Manufacturer statement",
  "owner-verified": "Verified by PumpPath, not a manufacturer statement",
  "rule-resolved": "Manufacturer sources disagree; PumpPath kept this value by rule",
  "retailer-listed": "Retailer listing, not confirmed by the manufacturer",
  derived: "PumpPath derived this from other catalog facts",
  interpreted: "PumpPath interpretation of manufacturer information",
  conflicting: "Not verified: manufacturer sources disagree",
  unknown: "Not verified",
};

const isOwner = (e: Evidence) => e.kind === "owner-decision" || (e.kind === "research" && e.evidenceClass === "owner-verified");
const researchClass = (evidence: Evidence[], c: string) => evidence.some((e) => e.kind === "research" && e.evidenceClass === c);

export function factLabel(a: Attribute<unknown>): FactLabel {
  switch (a.status) {
    case "verified": {
      // Any owner evidence makes the value owner-verified: it is never presented as manufacturer-confirmed.
      const kind = a.evidence.some(isOwner) ? "owner-verified" : "manufacturer-verified";
      return { kind, text: TEXT[kind] };
    }
    case "inferred": {
      const kind: FactLabelKind = a.ruleResolution
        ? "rule-resolved"
        : researchClass(a.evidence, "retailer-listing")
          ? "retailer-listed"
          : researchClass(a.evidence, "derived-from-catalog") && !a.evidence.some(isSourceQuote)
            ? "derived"
            : "interpreted";
      return { kind, text: TEXT[kind] };
    }
    case "not-applicable":
      return { kind: "not-applicable", text: NOT_APPLICABLE_TEXT[a.reason] };
    case "conflicting":
      return { kind: "conflicting", text: TEXT.conflicting };
    case "unknown":
      return { kind: "unknown", text: TEXT.unknown };
  }
}
