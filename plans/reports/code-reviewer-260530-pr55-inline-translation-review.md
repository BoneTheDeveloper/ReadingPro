# Code Review: Manual Translate Trigger and Scope-Aware Quick Mode

## Scope

- **Files:** 14 changed (2 new untracked, 12 modified)
- **LOC:** ~354 added / ~185 removed
- **Focus:** Recent uncommitted changes on `feat/inline-translation-study-ui`
- **Plan:** `plans/260530-pr55-inline-translation-review-fixes/plan.md`
- **Scout findings:** See Edge Cases section

## Overall Assessment

The changes are well-structured and achieve the stated goals cleanly. The status state machine (`idle -> ready -> loading -> success | error`) replaces the previous dual boolean approach correctly. The scope-aware routing in the API route is a clear improvement. Typecheck and lint pass clean. The main concerns are: (1) a potential SSR hydration mismatch from reading `window` during render, (2) an unsafe type cast that could mask provider value drift, (3) a missing external dependency for the non-AI provider, and (4) a gap in API route test coverage for the new machine-scope path.

## Critical Issues

### C1. SSR hydration mismatch -- `window` accessed during component render body

**File:** `src/features/study/study-translation-popup.tsx:64-65`

```tsx
const viewportHeight = window.innerHeight;
const viewportWidth = document.documentElement.clientWidth;
```

These lines run on every render at the top level of the component function (outside `useEffect` or `useMemo`). In Next.js with SSR, the server render produces no `window`/`document`, while the client render does. This causes a hydration mismatch and, depending on the render path, could throw on the server.

**Why it matters now:** The popup is conditionally rendered (`selection && activePassage`) and the parent has `"use client"`, so in practice this component only mounts client-side. This is a latent defect that existed before this diff. However, the new `showAbove` logic now uses `POPUP_ESTIMATED_HEIGHT` and `Math.max(8, ...)` which makes the positioning calculation more sensitive to the viewport values. If the component ever gets pre-rendered (e.g., through a future refactor or testing utility), this will break.

**Recommendation:** Wrap the viewport calculation in `useMemo` or move it to a `useLayoutEffect`, or add a `typeof window !== "undefined"` guard. This is non-blocking for now but should be tracked.

### C2. Unsafe `as` cast on provider value

**File:** `src/app/api/translate/route.ts:309`

```ts
provider: providerResult.provider as QuickTranslation["provider"],
```

`NonAiTranslationResult.provider` is typed as `string` (line 8 of `non-ai-machine-translation-provider.ts`), but it is cast to the Zod-validated union `"cache" | "dictionary" | "fallback" | "google_translate"`. If the hardcoded `"google_translate"` string in the provider module ever drifts from the Zod enum (typo, rename), the cast silently passes an invalid value through the pipeline, which would fail Zod parsing when read from cache later.

**Recommendation:** Type `NonAiTranslationResult.provider` as the literal `"google_translate"` instead of `string`, or use a shared constant. This eliminates the cast entirely.

```ts
// non-ai-machine-translation-provider.ts
const PROVIDER_ID = "google_translate" as const;
type ProviderId = typeof PROVIDER_ID;

interface NonAiTranslationResult {
  translation: string;
  provider: ProviderId;
}
```

## High Priority

### H1. No unit tests for `translateWithNonAiProvider`

**File:** `src/lib/translation/non-ai-machine-translation-provider.ts`

The non-AI provider module has zero test coverage. It calls an external HTTP endpoint (`translate.googleapis.com`), parses a non-trivial response shape, and has multiple error paths (non-OK status, empty translation, network timeout). None of these paths are tested.

**Impact:** Acceptance criteria #10 requires "sentence/paragraph quick-mode tests prove no AI SDK call occurs" and "repeated identical request returns provider `cache` without re-calling non-AI provider." The API route tests only cover dictionary-scope texts (all test fixtures are short phrases). There are no tests that send a machine-scope text through the route and verify the non-AI provider is called (or that the cache path short-circuits it).

**Recommendation:** Add at minimum:
1. A unit test for `translateWithNonAiProvider` that mocks `fetch` and verifies: successful translation, non-OK status throws, empty result throws, network timeout throws.
2. An API route test that sends a sentence-length text (e.g., `"Key concerns include algorithmic bias in automated hiring systems."`) and verifies the non-AI provider is called (not AI SDK, not dictionary), the response has `provider: "google_translate"`, and a repeat request returns `provider: "cache"`.

### H2. External HTTP call in server route has no dependency verification

**File:** `src/lib/translation/non-ai-machine-translation-provider.ts:23-27`

The provider makes an outbound HTTP call to `https://translate.googleapis.com/translate_a/single`. This is a free, undocumented endpoint. If it is unavailable or rate-limited, the route returns a 500. There is no health check, circuit breaker, or fallback mechanism.

**Impact:** This is acceptable per plan scope ("No AI fallback in quick mode"), but the operational risk should be documented. The 8-second timeout is reasonable.

**Recommendation:** Document in the route handler or provider module that the Google Translate free endpoint is undocumented and may be rate-limited or deprecated. Consider adding a log+metric for provider latency so oncall can detect degradation.

### H3. `handleQuickTranslate` closes over stale `selection` via closure

**File:** `src/features/study/study-page-client.tsx:102-155`

```ts
const handleQuickTranslate = useCallback(() => {
  if (!selection || quickTranslationState.status === "loading") return;
  // ...uses `selection` in the fetch body
}, [selection, quickTranslationState.status]);
```

The function body reads `selection` from the closure at the time of the click. Because `handleQuickTranslate` is only rendered when `status === "ready"`, and `selection` is set at the same time as status transitions to "ready", the closure value should be current. However, the dependency array includes both `selection` and `quickTranslationState.status`, which means the callback is recreated whenever either changes. This is correct but fragile -- if someone later changes the status check guard, the closure could capture a stale selection.

**Recommendation:** Consider using a ref for `selection` in the fetch body to make the dependency more explicit, or add a comment documenting the invariant. Low urgency.

## Medium Priority

### M1. API route test gap -- no machine-scope quick translation test

**File:** `__tests__/api/translation-vocabulary-routes.test.ts`

All existing quick translation tests use short texts (`"algorithmic bias"`, `"algorithm"`, `"bias"`, `"data"`, `"quorvex drift"`) that are classified as `dictionary` scope. None exercise the `machine` scope branch (sentence/paragraph). The test at line 137-180 explicitly tests dictionary scope only.

This means acceptance criteria #4 and #10 have no automated verification at the API route level.

**Recommendation:** Add a test case that sends a full sentence as `text` and mocks the non-AI provider fetch to verify:
- The dictionary path is NOT called
- The non-AI provider IS called
- The response has `provider: "google_translate"`
- A repeat request returns `provider: "cache"`

### M2. `getQuickSelectionScope` does not validate input

**File:** `src/lib/translation/quick-selection-scope.ts`

The function assumes `text` is a non-empty string. If called with `""`, `text.trim()` returns `""`, the regex doesn't match, `split(/\s+/)` returns `[""]`, length is 1 (under 5), and length is 0 (under 41), so it returns `"dictionary"`. This is technically unreachable because the Zod schema requires `min(1)`, but the function itself has no guard.

**Recommendation:** Add `if (!text.trim()) return "dictionary";` at the top for defense in depth, or add a JSDoc contract note.

### M3. `tryAgain` i18n key placement ambiguity

**File:** `src/features/study/study-translation-popup.tsx:139` and `localization/messages/en.json`

There are two `tryAgain` keys in `en.json`: one at the top level (line 5, "Try again") and one nested under `Study` (line 189, "Try Again"). The popup uses `t("tryAgain")` where `t` is `useTranslations("Study")`, so it resolves to the `Study.tryAgain` key ("Try Again"). This works correctly but could be confusing during maintenance.

**Recommendation:** Consider renaming the popup's retry key to `retryTranslation` or `tryAgainTranslation` for clarity. Non-blocking.

### M4. `QuickTranslationStatus` type duplicated across two files

**Files:**
- `src/features/study/study-page-client.tsx:19`
- `src/features/study/study-translation-popup.tsx:11`

Both files define the same `type QuickTranslationStatus = "idle" | "ready" | "loading" | "success" | "error"`. If one is updated without the other, the types diverge silently.

**Recommendation:** Extract to `src/features/study/study-types.ts` alongside the other shared types.

## Low Priority

### L1. `AbortSignal.timeout(8000)` compatibility

**File:** `src/lib/translation/non-ai-machine-translation-provider.ts:26`

`AbortSignal.timeout()` is available in Node 18+, modern browsers, and Edge Runtime. This is fine for the current deployment target.

### L2. Popup positioning uses estimated height, not measured

**File:** `src/features/study/study-translation-popup.tsx:24,69-72`

`POPUP_ESTIMATED_HEIGHT = 120` is a hardcoded estimate. In practice, the popup height varies with content length. The `Math.max(8, ...)` clamp prevents negative positioning, so the worst case is the popup slightly overlapping the selection. This is acceptable for an MVP.

### L3. Unused import `Bookmark` may remain in study-content-panel

**File:** `src/features/study/study-content-panel.tsx:10`

The `Bookmark` import is still used in the bottom action bar (line 199), so this is fine. No action needed.

## Edge Cases Found by Scout

1. **Race condition between rapid selection and translate click:** The `requestId` counter correctly gates stale responses. The `.then()` chain checks `prev.requestId !== requestId` before applying. This is correct.

2. **Double-click dedupe boundary:** The 300ms window in `study-content-panel.tsx:59` handles the double-click case where `mouseup` + `dblclick` fire in rapid succession. If a browser fires them >300ms apart (unlikely but possible with accessibility tools), the dedupe would not kick in. The impact is minor -- it would just reset the selection state to "ready" again with the same data.

3. **Non-AI provider URL injection:** The `encodeURIComponent(input.text)` on line 23 of the provider is correct. The `sourceLanguage` and `targetLanguage` values are constrained by Zod to literals `"en"` and `"vi"`, so there is no injection risk through those parameters.

4. **Cache key includes mode but not scope:** The cache key is built from `userId + sourceId + selectedText + contextSentence + targetLanguage + mode`. Two requests with the same text but different scopes (impossible in the current flow since scope is derived from text) would share a cache entry. This is not a real risk because scope is deterministic from text length/content.

5. **Provider enum consistency:** The `TranslationProvider` type in `study-types.ts` includes `"ai"` which is not in the quick translation Zod schema. This is intentional -- `"ai"` is used for detailed translations. No issue.

## Positive Observations

1. **Clean status state machine:** The `QuickTranslationStatus` union type with five states is a significant improvement over the previous `loading: boolean + error: boolean` approach. Each UI state maps to exactly one render branch in the popup.

2. **Loading guard prevents duplicate requests:** `handleQuickTranslate` checks `quickTranslationState.status === "loading"` before initiating a new request. The integration test at line 492 verifies this with rapid clicks. Well done.

3. **Punctuation normalization is targeted:** The `stripPunctuation` helper only strips leading/trailing punctuation from context tokens, preserving internal apostrophes (`[^\w']+`). This is correct for English contractions.

4. **Scope classifier is pure and testable:** `getQuickSelectionScope` is a pure function with no side effects, fully tested with 8 cases. Good separation of concerns.

5. **No Save vocabulary in quick popup:** The popup correctly has no Save action. Vocabulary save is preserved in the detailed Studio panel via `StudyStudioPanel`. The integration test verifies `screen.queryByRole("button", { name: /Save/ })` is null.

6. **Error retry in popup:** The error state renders a "Try Again" button that calls `onTranslate`, allowing retry without dismissing and re-selecting. Good UX.

7. **Sentry breadcrumbs updated:** The breadcrumb messages correctly separate "selection-captured" from "quick-request", maintaining observability for the new two-step flow.

8. **Request validation is unchanged:** The Zod schema for the translate request is not modified. The scope is inferred server-side from `text`, preserving API backward compatibility.

## Recommended Actions

1. **[High] Add tests for `translateWithNonAiProvider`** -- unit tests covering success, error, timeout. Add an API route test for machine-scope quick translation (acceptance criteria #4, #10).

2. **[High] Fix the unsafe cast** -- type `NonAiTranslationResult.provider` as `"google_translate"` literal instead of `string`.

3. **[Medium] Extract shared `QuickTranslationStatus` type** to `study-types.ts`.

4. **[Low] Guard SSR `window` access** -- wrap viewport reads in a guard or `useMemo`.

5. **[Low] Document operational risk** of the undocumented Google Translate endpoint.

## Acceptance Criteria Verification

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Highlight renders icon, no API call | PASS | `handleSelectionChange` sets `status: "ready"`, no fetch. Integration test verifies. |
| 2 | Click icon sends one quick request | PASS | `handleQuickTranslate` fires fetch. Guard prevents duplicates. Test confirms count=1. |
| 3 | Short selection uses dictionary resolver | PASS | `getQuickSelectionScope` returns `"dictionary"` for <=4 tokens. Route branches to `resolveQuickDictionaryTranslation`. API route tests cover. |
| 4 | Sentence/paragraph uses cache -> non-AI provider | PARTIAL | Logic is correct in route, but NO automated test sends a machine-scope text through the route. |
| 5 | Quick popup has no Save action | PASS | Popup JSX has no Save button. Test asserts `queryByRole("button", { name: /Save/ })` is null. |
| 6 | Popup positions above near viewport bottom | PASS | `showAbove` logic uses `POPUP_ESTIMATED_HEIGHT + POPUP_OFFSET_Y`. `Math.max(8, ...)` clamp prevents overflow. |
| 7 | Double-click deduped, no auto-translate | PASS | 300ms dedupe in `handleSelectionEvent`. No fetch on selection capture. |
| 8 | "bias" in "algorithmic bias." resolves phrase | PASS | `stripPunctuation` strips trailing `.` from context tokens. Dictionary test covers this exact case. |
| 9 | Quick mode tests prove no AI SDK call | PARTIAL | Dictionary-scope tests pass with `generateObject` not called. Machine-scope path has no test. |
| 10 | Repeated request returns provider "cache" | PARTIAL | Fallback cache-reuse test passes. Machine-scope cache-reuse has no test. |

## Metrics

- **Type Coverage:** 100% (typecheck passes clean)
- **Test Coverage:** Good for dictionary scope, UI state machine, and popup behavior. Gap for machine-scope API path and non-AI provider.
- **Linting Issues:** 0 (lint passes clean)

## Unresolved Questions

1. Is the undocumented Google Translate free endpoint (`client=gtx`) acceptable for production use, or should the team plan to integrate a paid translation API with SLA guarantees?
2. Should the `non-ai-machine-translation-provider` module be mockable in API route tests? Currently it is not mocked in `translation-vocabulary-routes.test.ts`, which means the route test for machine scope would make a real HTTP call unless the module is mocked.
3. The plan mentions Phase 5 (Seed Deployment Wiring) -- `prisma/seed-dictionary.ts` is not in the changed files. Was this phase completed in a prior commit, or is it still pending?
