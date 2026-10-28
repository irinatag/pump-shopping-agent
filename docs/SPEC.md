# PumpPath — Master Specification v2

**Status:** Milestone 1 completed; Milestone 2 pending approval.  
**Purpose:** Product requirements and remaining implementation plan for the existing PumpPath hackathon MVP.

## Instructions to Claude Code

You are a senior full-stack engineer, AI agent developer, and product designer. Build a functional, polished, mobile-first PumpPath demo, prioritizing a working end-to-end journey over infrastructure.

**Do not initialize or rebuild the project.** Inspect the existing repository before proposing changes. Milestone 1 is already implemented and reportedly passes 46 Vitest tests, typecheck, lint, and production build. Verify these claims against the local repository rather than assuming they remain true. Preserve existing behavior and tests unless a specifically approved milestone requires changes.

**Work one milestone at a time.** First compare this specification with the repository, identify conflicts or gaps, and propose Milestone 2 scope. **Do not modify files until I explicitly approve Milestone 2.** After each milestone, run checks, report files changed and manual test steps, then stop. Do not commit unless asked.

## 1. Product vision and scope

PumpPath helps users discover and compare **$0 out-of-pocket breast pumps** available under simulated health insurance coverage. Users select a fictional insurance plan once, answer a few preference questions, see a simulation of checking 12 fictional suppliers, receive 1–2 personalized pump recommendations, compare pump features and supplier offers, ask an AI shopping assistant questions, and explicitly approve a **simulated** order.

**Core proposition:** “Enter your insurance once. Find your best covered breast pump. Skip the hassle.”

All plans, suppliers, prices, eligibility, inventory, delivery estimates, and orders are **synthetic**. Do not claim real coverage verification, real-time inventory, real supplier communication, or actual order placement. Do not collect real insurance member IDs, prescriptions, payment details, dates of birth, or personal health information.

**Free-only recommendation policy:** Default search results and recommendations include only eligible, in-stock, fully covered offers with **$0 out-of-pocket cost**. Paid upgrade quotes may be retained and displayed **only in clearly labeled educational supplier-price comparisons**, especially Scenario B; never present a paid offer as a free recommendation or automatic fallback. Do not promise that every plan/preference combination has a free offer. Show an honest empty state if none exists in the simulation.

## 2. Technology and constraints

Use the existing single Next.js App Router application (Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Lucide), local TypeScript fixtures, Vitest, Zod validation as needed, and simple Next.js server functions/API routes. In Milestone 3 use the Anthropic Claude API **server-side only** for conversational explanations, with deterministic mock fallback when no API key is configured.

No monorepo, LangGraph, Trigger.dev, Docker, Redis, Supabase, workers, job queues, browser automation, real supplier websites, or production checkout. Use simple browser session storage for non-sensitive demo selections/orders if needed. Never store or expose secrets in client code or commits. Add `.env.example` later without real keys. Follow the version-matched Next.js docs at `node_modules/next/dist/docs/` where needed; preserve working Next.js configuration unless a change is necessary.

## 3. Existing Milestone 1 foundation — reuse, don't recreate

The repository currently contains these implemented modules (confirm actual names/exports before editing):

- `lib/types.ts`: pump, synthetic plan, supplier, quote, eligibility, search-result, preferences, scenario, and checkout-metadata types; money represented in integer cents.
- `lib/data/pumps.ts`: **9** fictional pump models spanning double-electric, wearable, manual, and hospital-grade categories. The original request for at least 12 models was **not implemented**; do not silently expand the catalog without approval.
- `lib/data/plans.ts`: **4** fictional insurance plans.
- `lib/data/suppliers.ts`: **12** fictional suppliers with networks, catalogs, stock, and shipping estimates.
- `lib/data/coverage-overrides.ts`: exact plan + supplier + pump out-of-pocket override; list price is the synthetic supplier price. The plan default is list price minus allowance, floored at zero. Overrides apply only after network/type eligibility checks. Insurance contribution plus customer contribution equals list price.
- `lib/catalog.ts`, `lib/pricing.ts`, `lib/eligibility.ts`, `lib/quotes.ts`, `lib/scenarios.ts`: deterministic catalog lookups, pricing, coverage, quotes, free-offer search, and demo scenarios.
- Vitest tests, shadcn components, and Tailwind styles already exist.

`findFreeOffers` returns exactly one of:

- `free_offers_found`: nonempty list of eligible, in-stock, fully covered $0 offers;
- `no_free_offers`: empty list, with no paid-upgrade fallback;
- `coverage_unverified`: empty list with `unknown_plan` or `verification_failed` reason.

`quoteOffer` / `quotesForPlan` may still expose paid quotes for educational comparison. Preserve stable pump and supplier IDs, deterministic behavior, and existing tests. Existing base ordering puts stock first, then coverage, then out-of-pocket amount, shipping speed, supplier ID, and pump ID. **Do not mistake this offer ordering for the preference-based product recommendation algorithm planned for Milestone 3.**

## 4. Product design

Premium but calm, welcoming, mobile-first design: warm off-white, soft lavender and muted sage, rounded cards, accessible typography, generous whitespace, simple progress indicators, and trustworthy language. Avoid stereotypically pink design. Clearly label simulation/demo mode throughout.

### Screen 1 — Landing

Headline direction: “Your insurance may cover a breast pump at $0. Let's find your options.” Do not guarantee coverage before simulated checking. CTA: **Find my free pump**; secondary: **How it works**. Briefly explain the three-step process.

### Screen 2 — Guided onboarding

One question per step, progress indicator, back navigation, and skippable optional fields. Start with **fictional plan selection** using the four existing plans. Then gather preferred pump type (using catalog types), pumping situation (exclusively pumping, returning to work, occasional use, unsure), and priority (hands-free, comfort, portability, efficiency). Optional state selection is allowed **only if the existing engine supports state-based filtering or that change is explicitly approved**; do not imply geographic eligibility checks that do not exist. Do not request real provider/member identifiers. **Do not ask willingness to pay or upgrade budget** in this free-only MVP.

### Screen 3 — Simulated supplier checking

Visually show 12 fictional supplier rows with waiting, checking, completed, no eligible free offers, or simulated failure statuses. Display brief, bounded progress messages (checking fictional plan networks, $0 offers, availability, shipping). Any delays should be short and explicitly simulated. Do not claim actual supplier API calls. Finish by navigating to results.

### Screen 4 — Free results and recommendations

Display only eligible, in-stock $0 offers in default search results. Group identical `pumpId` offers into **one pump model** with multiple supplier choices; do not duplicate the same model as separate recommended products. Show model name/type, meaningful specs, why it suits preferences (Milestone 3), best $0 supplier, other $0 suppliers, and estimated shipping. Allow filtering by pump type and sorting by shipping where appropriate, without violating the free-only invariant.

The results screen should ultimately show **top 1–2 recommended pump models**, but the personalized scoring belongs to Milestone 3. Milestone 2 may show a clearly labeled deterministic offer ordering without claiming preference-based recommendations are implemented.

Handle all three `findFreeOffers` states with distinct, accessible UI: results, no free offers, and coverage unverified. Offer retry/change-plan/change-preferences actions. Never silently show paid upgrades as fallback.

### Screen 5 — Comparison

Compare up to two distinct pump models side-by-side: type, portability, battery, noise, hands-free use, cleaning, advantages, tradeoffs, $0 availability, and supplier shipping (only show fields actually present in catalog; mark missing values unknown rather than inventing them). Also provide a separate, clearly labeled **supplier-price comparison** for the *same* pump in Scenario B. This educational comparison may show a $75 quote, but it must never appear as a free recommendation.

### Screen 6 — Claude shopping assistant (Milestone 3)

Accessible from results. Answer questions about pump features, returning to work, ease of use, availability, and why the same pump is $0 at one supplier but $75 at another. Ground answers strictly in the current synthetic catalog, plan, quotes, and user preferences. Claude must **not calculate or invent** eligibility, prices, stock, or delivery estimates. Server-side API only; deterministic mock fallback when the key is absent.

### Screen 7 — Simulated checkout (Milestone 4)

Review selected $0 pump and fictional supplier, simulated insurance coverage, shipping cost if applicable, total out-of-pocket cost, and estimated delivery. The free-only promise applies to **total customer cost**: if a shipping charge would make the total nonzero, do not label it a $0 offer or permit it as a free checkout without an explicit approved product decision. Require explicit user approval before submission. Never process real orders, real payment, or real insurance identifiers. Use idempotency keys and safe status reconciliation on timeout.

### Screen 8 — Confirmation (Milestone 4)

Show fictional order reference, model, supplier, simulated cost, and delivery estimate **only after confirmed mock checkout success**. Clearly mark as a demo.

## 5. Demo scenarios — authoritative definitions

Provide a simple selector visible only in demo mode. There are **three** scenarios, not four.

**A — Multiple free options:** Evergreen PPO, double-electric preference; expected **8 in-stock $0 offers from 6 suppliers** (as reported at Milestone 1 completion). Recommend the best 1–2 distinct models in Milestone 3, using preferences and shipping.

**B — Same model, different supplier price:** Evergreen PPO, **Nestlark Classic** (fictional list price $229). **Bloom Maternity** offers it at **$0** with 5-day shipping; **MamaMend** offers the exact same `pumpId` at **$75** with 4-day shipping. Both are in network and in stock. The $0 Bloom offer appears in free search and ranks ahead of the paid quote; the $75 quote appears only in labeled supplier-price comparison. The override is plan-specific; the same model at MamaMend is $0 under Bayview.

**H — Order timeout:** Summit EPO, **Lunaria Duo** from **Coastal Care**, eligible/in stock/$0. In Milestone 4 simulate submission timeout, display pending reconciliation (not success), reuse an idempotency key on retry, and prevent duplicate confirmed orders. Milestone 1 currently contains metadata only; checkout behavior is not implemented.

**Scenario E is permanently removed from this MVP.** Do not add it back. Ordinary no-free-offer and coverage-unverified states must still be tested and handled gracefully, but are not selectable demo scenarios.

## 6. Recommendation engine (Milestone 3)

Keep coverage and price decisions deterministic and separate from AI. First filter to eligible, in-stock, $0 total-cost offers. Group by pump ID. Then apply a simple explainable weighted suitability score based on preferences, pumping situation, pump features, and shipping. Recommend top 1–2 **models**, each with its best eligible $0 supplier and alternative $0 suppliers. Deterministic tie-breaking. Missing prices are `null`/unknown, **never** treated as $0. Claude provides prose explanations only.

## 7. Simulated supplier architecture

Reuse the existing shared eligibility, quote, and catalog functions. If useful for Milestone 2, introduce a minimal adapter/connector interface for supplier progress (`checkEligibility`, `getOffers`) without refactoring the engine or implementing real external calls. Defer `prepareCheckout` until Milestone 4. Keep short, deterministic simulated delays and bounded failures.

## 8. Tests and verification

Preserve the existing 46 tests reported at Milestone 1 completion. Add focused tests per milestone; no heavy E2E framework required. Important invariants:

1. Free search returns only in-stock, fully covered $0 offers.
2. Unknown plans and simulated verification failures return `coverage_unverified`, not fabricated coverage.
3. No-free-offer state has an empty list and no paid fallback.
4. Scenario B compares the same pump ID at $0 versus $75, without treating the paid quote as free.
5. Results group supplier offers by pump model; preferences do not introduce paid results.
6. Checkout requires explicit approval; timeout never produces premature confirmation or duplicate orders.
7. UI accurately labels all results as synthetic.

After each milestone run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`; report results and any failing checks.

## 9. Resource and security constraints

Keep one Next.js app; no Docker, database containers, background workers, headless browsers, or parallel supplier browsers. Do not leave watchers running. Use bounded test/build commands and local fixtures. Never use real patient data or supplier connections. Keep Anthropic API key server-side; create a safe `.env.example`. Never commit credentials. Prefer simple code that can later be extended with real integrations.

## 10. Remaining implementation milestones

### Milestone 1 — COMPLETE (do not redo)

Existing Next.js scaffold, shadcn/ui, nine synthetic pumps, four plans, twelve fictional suppliers, coverage override pricing, free-only search, three scenario definitions, and 46 passing tests reported. Treat the repository as authoritative for current implementation details.

### Milestone 2 — User journey and comparison (next; approval required)

Build landing page, fictional plan onboarding, optional pump preferences, simulated 12-supplier progress, free-only results, grouping of same-model supplier offers, filters, comparison UI, and all three search states. Add a demo selector for A/B/H if practical; Scenario H can be marked “checkout demo available in Milestone 4.” Use existing engine, no Claude API and no checkout implementation. Add focused tests and verify manually.

### Milestone 3 — Personalized recommendations and AI

Implement preference-based deterministic model scoring and top 1–2 recommendations. Add grounded Claude explanations/chat and deterministic mock fallback. No model-driven eligibility or pricing decisions.

### Milestone 4 — Simulated checkout

Add order review, explicit approval, mock checkout engine, idempotency and timeout reconciliation, and success-only confirmation. Implement Scenario H end to end.

### Milestone 5 — Polish and demo readiness

Responsive refinements, accessibility, loading/empty/error states, docs, `.env.example`, demo instructions, tests, and Vercel readiness.

## 11. Definition of done

A user can select a fictional plan, specify preferences, watch 12 simulated supplier checks, receive 1–2 personalized free-pump model recommendations, compare $0 offers across fictional suppliers, see Scenario B's educational $0/$75 supplier comparison, chat with Claude or deterministic fallback, explicitly approve a mock $0 order, and see confirmation only on confirmed success. Scenario H handles timeout without duplicate orders. All outputs are labeled simulated; no real orders or supplier contacts occur.

## Immediate next action

**Do not implement anything yet.** Inspect the current repository, compare it to this v2 specification, summarize conflicts and assumptions, and propose a bounded Milestone 2 plan. Wait for my explicit approval before editing files.
