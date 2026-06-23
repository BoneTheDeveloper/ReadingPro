# Brainstorm: Test Strategy Rationalization

**Date:** 2026-06-22
**Status:** Approved (Surgical path)
**Scope:** Vitest suite only (`tests/vitest/` + `src/**`.test.ts). Does not touch `tests/performance/` or Playwright (not present).

## Problem

The repository has grown to 60 Vitest test files (~8.7k LOC) with a single global coverage gate of `lines: 80` against a hand-curated `appLogicCoverageInclude` array of 41 files. Three patterns are unhealthy:

1. **Coverage theater**: files in the coverage include list (Sentry config, instrumentation, global-error, sentry-example-api) have no test files. They contribute zero risk detection and inflate the coverage numerator — making the 80% line gate easier to pass without actually catching failures.
2. **Kitchen-sink duplication**: `tests/vitest/integration/api/routes.test.ts` (571 LOC) re-tests 6 routes already covered by dedicated files (`upload-routes.test.ts`, `study-session-route.test.ts`, `study-chat-route.test.ts`, `health-and-env-contract.test.ts`, `routes.test.ts` partial).
3. **Static unit tests in the coverage gate**: pure-function tests (`reading-utils`, `cefr`, `translation-limits`, `vocabulary-text-utils`, `selection-utils`, `prompt-utils`, `prisma-query-metrics`, `study-translation-popup`) are 39–180 LOC, high branch coverage, near-zero failure surface. They protect against accidental regressions but contribute little to failure-finding, and they raise the bar (per the gate) for editing those helpers.

Concurrently, **6 routes are explicit GAPs** (no HTTP-level integration test) and the Clerk sign-out flow has no automated coverage. These are the real failure surface the suite should be investing in.

## Goal

- **Keep** high-value tests (race conditions, contract envelopes, state machines, non-obvious invariants).
- **Cut** duplication and coverage-only filler.
- **Two-tier coverage**: real-app-logic files keep the 80% line gate; pure helpers are reported but do not fail CI.
- **Fill the GAPs**: add HTTP-level tests for the 6 missing routes + sign-out.

## Findings (test classification)

### High value — keep, invest

| File | Why it stays |
|---|---|
| `src/server/db/study-session-queries.test.ts` | Advisory-lock + stale-sweep race; per-user lock key serialization. Hard to reason about, easy to break. |
| `src/server/db/passage-queries.test.ts` | Zod discriminator (`correctOption must match one of the option ids`); soft-delete filter; new-cards join. |
| `tests/vitest/integration/services/upload-workflow.test.ts` | Multi-step workflow with auth, blob storage, analysis fallback chain. |
| `tests/vitest/integration/services/content-analysis-service.test.ts` | AI provider fallback (AI → heuristic); CEFR persistence. |
| `tests/vitest/integration/services/passage-study-service.test.ts` | Simplification skip path; passage + questions + studio artifacts orchestration. |
| `tests/vitest/integration/api/dictionary-*-route.test.ts` | Auth envelope + query params + 401/500 mapping. |
| `src/app/api/webhooks/clerk/route.test.ts` | Webhook signature validation; map → upsert path. |
| `src/features/study/hooks/use-study-*.test.ts` | React state machine + async race surface. |
| `src/server/auth/sync-user.test.ts` | Null-field fallback for upsert; explicit field pass-through. |
| `src/server/auth/auth-utils.test.ts` | Auth state mapping. |
| `tests/vitest/unit/observability/sentry-logger.test.ts` | Sensitive-data scrubbing — if this breaks, secrets leak to Sentry. |

### Medium value — keep, thin

Per-route integration tests (`vocabulary-list-route.test.ts`, `vocabulary-save-route.test.ts`, vocabulary set routes, studio-questions-route, study-chat-route). Each tests a thin route shell around a service. Most of these already assert through `expectApiSuccessPayload(payload)` schema — the duplication is in the route handler instantiation, not the assertion. **Action:** keep, no rewrite.

### Low value — keep for regression, **remove from coverage gate**

| File | LOC | Reason |
|---|---|---|
| `src/contracts/reading-utils.test.ts` | 39 | Pure function: highlight challenging words by CEFR. Re-asserted by type signature. |
| `src/contracts/domain/cefr.test.ts` | 46 | Pure mapping table + heuristic classifier. |
| `src/contracts/translation/translation-limits.test.ts` | 40 | Pure clamping logic. |
| `src/server/db/vocabulary-text-utils.test.ts` | 36 | Pure normalize function. |
| `src/features/study/model/selection-utils.test.ts` | 66 | Pure geometry math. |
| `src/server/ai/prompt-utils.test.ts` | 19 | Trivial string templating. |
| `src/features/study/ui/studio/translate/.../study-translation-popup.test.tsx` (in `tests/vitest/integration/components/study/`) | 62 | Pure geometry math — but located in `integration/components/`. Rehome. |
| `src/server/observability/prisma-query-metrics.test.ts` | 41 | Internal counter logic; no external contract. |
| `src/server/modules/spaced-repetition/scheduler.test.ts` | 42 | Pure state-machine. Tests live in a co-located `*.test.ts`; type-safe and small. |

These stay **as files** (they document behavior), but their source files move out of `appLogicCoverageInclude`. A separate `appLogicCoverageSoftInclude` array reports coverage for them without failing CI.

### Coverage filler — remove from include

5 files in `appLogicCoverageInclude` have **no test files** in the repo. Including them in the gate means the gate can pass without ever testing them, while their numerator still counts toward 80%:

- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/instrumentation.ts`
- `src/instrumentation-client.ts`
- `src/app/global-error.tsx`
- `src/app/api/sentry-example-api/route.ts` (no test; covered indirectly by `health-and-env-contract` smoke)

**Action:** remove from `include`. If a future test is added, re-include.

### Redundant — delete

- `tests/vitest/integration/api/routes.test.ts` (571 LOC). Re-tests `/api/health`, `/api/progress/stats`, `/api/study/sessions`, `/api/study/studio/chat`, `/api/upload`, `/api/upload/text` — every one already covered by a dedicated file. **Action:** delete.

### Smoke — keep, document

- `tests/vitest/smoke/infrastructure.test.tsx` (53 LOC). Proves Vitest + jsdom + jest-dom + path aliases + db/AI mocks are wired. Useful sanity check. **Action:** keep, document that it should never count toward coverage.

## Coverage gate redesign

Replace single `appLogicCoverageInclude` with two tiers:

```ts
const appLogicCoverageInclude = [
  // Tier 1 — real failure surface, gate at 80%
  "src/lib/shared/reading-utils.ts",
  // ... only the 21 files from the "high value" classification
];

const appLogicCoverageSoftInclude = [
  // Tier 2 — pure helpers, report %, no gate
  "src/contracts/reading-utils.ts",
  // ... 9 files from "low value"
];
```

Vitest v4 supports `coverage.thresholds` per `include` glob via separate reporter configs but not as a first-class per-array threshold. Practical options:

- **Option A (chosen):** Single `include` array = Tier 1 + Tier 2. **Keep `lines: 80` global threshold.** The Tier 2 files are still in scope, but their coverage no longer matters *because they are tiny pure functions with no branches* — their coverage will be ~100% by construction. The 80% gate will be driven almost entirely by Tier 1.
- **Option B:** Split config files; run two `vitest --coverage` invocations in CI. Heavy machinery for marginal gain.
- **Option C:** Drop the line threshold entirely; rely on per-file `it.skip` discipline. Goes against the team's stated preference for an enforced gate.

**Decision:** Option A. The structural argument is "the gate exists to catch branches in real app logic, not pure helpers." The implementation reality is "if your helpers are pure and small, they hit 100% by themselves and the global gate is fine."

## GAP test plan

From `docs/Testing/traceability-matrix.md`:

| GAP | New test file |
|---|---|
| `POST /api/vocabulary/[id]/review` | `tests/vitest/integration/api/vocabulary-review-route.test.ts` |
| `POST /api/study/passages` | `tests/vitest/integration/api/passage-create-route.test.ts` |
| `DELETE /api/study/passages/[id]` | extend `passage-create-route.test.ts` |
| `POST /api/study/passages/[id]/simplify` | `tests/vitest/integration/api/passage-simplify-route.test.ts` |
| `GET /api/study/studio/artifacts` | `tests/vitest/integration/api/studio-artifacts-route.test.ts` |
| `GET /api/study/studio/artifacts/[id]` | extend above |
| `POST /api/study/studio/artifacts/[id]/quiz-result` | extend above |
| Clerk sign-out | covered manually; flag in traceability matrix |
| `GET /api/sentry-example-api` | de-prioritize; smoke check is enough |

## Risks

- **Coverage number might dip below 80%** after deleting `routes.test.ts` and removing 5 include entries. Mitigation: measure first, expect ~2–4% dip, re-tune gate if needed.
- **Pure-function tests drift silently.** Mitigation: keep them as files, just not in gate. They're cheap to run.
- **Risk of deleting a test that catches a real bug we forgot.** Mitigation: each removal must be justified by reference to (a) function purity + (b) absence of historical failure. If unsure, keep.
- **The 6 GAP routes might be low-traffic, low-risk.** Mitigation: prioritize those that take user input and mutate state (`/vocabulary/[id]/review`, `/studio/artifacts/[id]/quiz-result`, `/study/passages/[id]/simplify`). De-prioritize `DELETE /api/study/passages/[id]` (soft-delete only).

## Decision log

| Decision | Choice | Rationale |
|---|---|---|
| Cut depth | Surgical | Matches user's stated scope; minimal blast radius. |
| `routes.test.ts` | Delete entirely | Every route it tests has a dedicated file; verified by `grep`. |
| Pure-fn coverage | Keep tests, remove from gate | Documents behavior; cannot meaningfully fail the gate if pure. |
| Plan next | Yes | User approved. |

## Component test layer — findings and cuts

User follow-up confirmed: component tests are "too forced for all page". 7 files, 1,610 LOC, 43 test cases. After analysis:

### Static-render assertions to delete

These tests assert that a rendered DOM contains expected text/disabled buttons. They cannot fail unless the component is wholesale deleted or copy is changed. They cover zero failure surface.

| File | Tests to delete | Why |
|---|---|---|
| `tests/vitest/integration/components/upload/text-input-area.integration.test.tsx` | `it("renders an empty paste area with disabled submit", ...)`, `it("disables input and shows processing state while work is running", ...)` | Static text + disabled state. No interaction. |
| `tests/vitest/integration/components/progress/progress-dashboard.integration.test.tsx` | `it("loads and renders progress stats", ...)` | Asserts spinner + text after a successful fetch. Coupling to copy text in `en.json`. |
| `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx` | 3 tests primarily asserting `Sentry.startSpan({...})` shape and breadcrumb attributes | Drift on every Sentry config change. Breadcrumb shape is not a behavior of the chat panel. |

Keep from those files: the schema-rejection tests, the network-failure fallback test, the navigation test, the retry-button test. Those exercise real failure surfaces.

### Misfiled unit test

`tests/vitest/integration/components/study/study-translation-popup.test.tsx` (62 LOC, 5 tests) is **not** a component test — every `it()` block calls a pure geometry function with no React rendering. Move to `src/features/study/ui/studio/translate/translation-popup.test.ts` as a co-located unit test. Or delete outright: `selection-utils.test.ts` already covers the same geometry.

### Split, don't delete

`tests/vitest/integration/components/study/study-page-client.integration.test.tsx` (869 LOC, 17 tests) covers real failure surfaces (stale-response races, mode switching, malformed payloads, duplicate-click prevention). But it's the biggest file in the suite by ~300 LOC and mixes 3 concerns: workspace (sources/simplify/delete), studio (questions/quiz), translation (translate icon / vocabulary save / schema rejection).

Split into:
- `study-page-client.workspace.test.tsx` — sources, mode switching, simplify-eligibility, delete confirmation
- `study-page-client.studio.test.tsx` — generate questions, lazy-load on persisted artifact, quiz result detail
- `study-page-client.translation.test.tsx` — translate icon click, stale-response dedup, oversized-selection guard, schema rejection, vocabulary save details, duplicate-click prevention

Each ~290 LOC. Keeps every test; makes triage faster when one fails.

### Component-test inclusion rule (replaces "force test for all page")

A component earns a test file only if **any** of:
1. The component owns a **race / stale-response / mode-switch** state machine that the hooks tests can't reach.
2. The component owns a **non-obvious external contract** — alert dialog text, Sentry alert, navigation side-effect.
3. The component's **interaction model differs from its render** — popup positioning, debounced search, lazy-loaded children.

If none apply, the page is a composition of already-tested hooks + routes. **No component test.**

### Net change

7 component test files → 9 (after split) but **43 test cases → ~22**. ~50% reduction. Most cuts remove assertions on text labels and disabled states — those are guaranteed by React's render, not by the component's logic.

## Next step

Hand off to `/ck:plan` for phase-by-phase implementation. Phases expected:

1. Phase 1 — measure baseline coverage; delete `routes.test.ts`; re-measure.
2. Phase 2 — split `include` into two arrays (Tier 1 + Tier 2), re-measure.
3. Phase 3 — fill the 4 highest-priority GAP routes.
4. Phase 4 — thin the "low value" unit tests (1–2 cases per function).
5. Phase 5 — delete static-render component assertions (text-input-area, progress-dashboard, study-chat-panel).
6. Phase 6 — split `study-page-client.integration.test.tsx` into 3 files by concern.
7. Phase 7 — rehome `study-translation-popup.test.tsx` (delete or move to co-located unit).
8. Phase 8 — update `docs/Testing/test-scenarios.md` and `traceability-matrix.md`.
