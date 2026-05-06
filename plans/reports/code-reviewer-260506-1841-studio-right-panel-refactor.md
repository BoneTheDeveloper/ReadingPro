# Code Review: Studio Right Panel Layout Refactor

**Scope:** 3 files modified (~290 LOC diff)
**Focus:** correctness, type safety, edge cases, React patterns
**TypeScript:** passes (`tsc --noEmit` clean)

---

## Critical Issues

### C1. Race condition: passage switch during async generation

**File:** `src/app/(dashboard)/study/study-page-client.tsx:122-192`

`handleActionClick` captures `passageId` and `passage` from closure at call time, but the async action (`studyGenerateQuestionsAction` / `studySimplifyAction`) runs against the server. If the user switches passage via `handleSelectDocument` while generation is in-flight:

1. `setResults` updates the result item with `completed` status -- the result now points to the *old* passageId
2. The `setState` for quiz success writes `result.questions` into `state.questions` unconditionally (line 149) -- but `activePassageId` has changed, so `state.questions` now holds questions for the wrong passage
3. For summary success (line 175-182), `prev.passages.map` updates the *new* active passage with the old passage's simplified content

**Impact:** Data corruption -- questions/content get associated with the wrong passage. The user sees incorrect content.

**Fix:** After the async action resolves, verify `passageId` is still the active passage before committing state mutations. Use a ref or compare inside the `setState` callback:

```ts
// After await, before setState mutations:
const currentPassageId = /* read from ref or re-check */;
if (currentPassageId !== passageId) {
  // Update result as error or stale, don't touch state.questions/passages
  setResults(prev => prev.map(r => r.id === resultId
    ? { ...r, status: 'error' as const }
    : r));
  return;
}
```

### C2. `handleSimplify` and `handleActionClick('summary')` both mutate `simplifying` -- double-entry possible

**File:** `src/app/(dashboard)/study/study-page-client.tsx:81-111, 158-190`

The content panel's "Simplify" button calls `handleSimplify`, and the studio card also calls `handleActionClick('summary')`. Both set `state.simplifying = true` and call `studySimplifyAction`. Nothing prevents the user from triggering both simultaneously:

1. User clicks "Simplify" in content panel
2. User clicks "Summary" card in studio panel
3. Two concurrent `studySimplifyAction` calls for the same passage
4. Both write to `passages.map(...)` -- last writer wins, potentially with stale data if one resolves faster
5. Both update results -- two result items created for the same operation

**Impact:** Duplicate work, potential data inconsistency, confusing UI (two running indicators for the same thing).

**Fix:** Either disable the content panel simplify button when a summary result is already running for the same passageId, or unify the two codepaths so `handleSimplify` delegates to `handleActionClick('summary')` (or vice versa).

---

## High Priority

### H1. Unused import: `SimplifyResult`

**File:** `src/app/(dashboard)/study/study-page-client.tsx:6`

```ts
import type { SimplifyResult } from '@/app/actions/study-simplify-action';
```

This type is imported but never referenced. Dead import. Remove it.

### H2. `generatingQuestions` in `StudyState` is now write-only

**File:** `src/app/(dashboard)/study/study-types.ts:47`, `study-page-client.tsx:141-155`

`state.generatingQuestions` is set in `handleActionClick` but never read by any component or logic. It was previously passed to `StudyStudioPanel` as `generatingQuestions` prop -- that prop was removed in this refactor. The field is dead state.

**Impact:** Confusing state management. Every quiz generation toggles a flag nothing reads.

**Fix:** Remove `generatingQuestions` from `StudyState` and all `setState` calls that set it. Or, if the content panel should show a loading indicator during quiz generation, pass it through.

### H3. `viewingResult` holds stale reference when underlying `results` array item changes

**File:** `src/app/(dashboard)/study/study-right-panel.tsx:59`

```ts
const [viewingResult, setViewingResult] = useState<ResultItem | null>(null);
```

`viewingResult` is set by clicking a completed result. It holds a *copy* of the `ResultItem` at that moment. If the user is viewing a quiz result and the same passage gets a new quiz generated (new result item), `viewingResult` still points to the old snapshot -- this is actually fine for the current design since each result has a unique `id`.

However, if `results` array is reordered (new items prepended), the `viewingResult` object reference is independent, so back-navigation works correctly. **No bug here on closer analysis**, but worth noting the pattern relies on result identity being immutable after completion.

### H4. `formatRelativeTime` is static -- does not re-render

**File:** `src/app/(dashboard)/study/study-right-panel.tsx:44-52`

`formatRelativeTime` is called during render, but the component only re-renders when `results` or `viewingResult` changes. The displayed "3m ago" will never update to "4m ago" until some other state change triggers a re-render.

**Impact:** Minor UX issue -- timestamps go stale. Low severity since results list is short-lived per session.

**Fix (optional):** Add a `useEffect` with `setInterval` (e.g., every 60s) to force re-render, or accept the staleness.

---

## Medium Priority

### M1. `resultMeta` keyed by `string` instead of `ResultItemType`

**File:** `src/app/(dashboard)/study/study-right-panel.tsx:39`

```ts
const resultMeta: Record<string, { icon: ...; label: string }> = {
```

Should be `Record<ResultItemType, ...>` for type safety. Currently, any string key silently falls through to the fallback `?? { icon: HelpCircle, label: viewingResult.type }` at line 63/156. Using the union type would catch missing entries at compile time.

### M2. No retry mechanism for failed results

**File:** `src/app/(dashboard)/study/study-right-panel.tsx:161-162`

Error results are rendered as disabled buttons with "Failed" text. No way to retry. The user must click the studio card again, which creates a *new* result item while the failed one persists in the list.

**Impact:** Cluttered results list with failed entries. UX friction.

**Fix (optional):** Allow clicking error results to re-trigger generation (reuse the same resultId), or add a dismiss/remove action.

### M3. `handleActionClick` dependency on `state.passages` causes unnecessary recreations

**File:** `src/app/(dashboard)/study/study-page-client.tsx:192`

```ts
}, [state.activePassageId, state.passages]);
```

`state.passages` is an array reference that changes on every passage mutation (upload, simplify, etc.). This causes `handleActionClick` to be recreated frequently. Consider using `state.passages.find(...)` inside the callback with just `state.activePassageId` as dependency, or use a ref for passages.

### M4. `QuizContent` `onReset` semantics changed silently

**File:** `src/app/(dashboard)/study/study-right-panel.tsx:85`

Previously, `onReset` was `handleReset` which cleared all state. Now it's `() => setViewingResult(null)` which only navigates back. The "New Passage" button in `QuizContent` (line 140-143) calls `onReset` expecting to go back to passage selection, but now it just closes the detail view.

**Impact:** Behavioral change. "New Passage" button no longer does what its label implies.

**Fix:** Pass the actual `handleReset` (or a callback that also resets quiz state) as `onReset` to `QuizContent`, or rename the button in `QuizContent` to "Back" or "Close".

---

## Low Priority

### L1. `noopStorage` type mismatch potential

**File:** `src/app/(dashboard)/study/study-page-client.tsx:14`

```ts
const noopStorage = { getItem: () => null, setItem: () => {} };
```

`useDefaultLayout` expects a `Storage`-like object. `getItem` returns `null` instead of `string | null` which matches, but `setItem` ignores its arguments. If `useDefaultLayout` calls `setItem` with arguments, TypeScript won't catch arity issues since the object is structurally typed. This is fine in practice but could be made explicit:

```ts
const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  get length() { return 0; },
  key: () => null,
};
```

### L2. Results list grows unbounded

No limit on `results` array size. Long sessions accumulate many items. Consider capping at N items or paginating.

---

## Positive Observations

- Clean separation of concerns: `ResultItem` type is well-designed with clear status transitions
- Optimistic UI pattern (add running item immediately) is correct and provides good UX
- `crypto.randomUUID()` for result IDs is appropriate
- The `skipped` simplify result handling correctly uses existing passage data
- Panel replacement view (viewingResult) is a clean pattern avoiding complex routing
- `maxConcurrent` limit prevents runaway parallel requests
- TypeScript types are well-defined; `ResultItemData` uses optional fields correctly

---

## Recommended Actions

1. **[Critical]** Add passage-id staleness check after async actions resolve (C1)
2. **[Critical]** Prevent duplicate simplify calls from content panel + studio card (C2)
3. **[High]** Remove unused `SimplifyResult` import (H1)
4. **[High]** Remove dead `generatingQuestions` state or wire it to content panel (H2)
5. **[Medium]** Fix `onReset` semantic change for QuizContent "New Passage" button (M4)
6. **[Medium]** Type `resultMeta` as `Record<ResultItemType, ...>` (M1)
7. **[Low]** Consider adding retry for failed results (M2)

---

## Metrics

- Type Coverage: 100% (tsc clean)
- Linting Issues: 1 (unused import)
- Files Changed: 3
- LOC Changed: ~290

## Unresolved Questions

- Should `generatingQuestions` be removed from `StudyState` entirely, or should the content panel show a loading state during quiz generation?
- Should "New Passage" in `QuizContent` reset all state or just navigate back? The current behavior mismatch needs a product decision.
- Is the results list expected to persist across passage switches, or should it filter by active passage?
