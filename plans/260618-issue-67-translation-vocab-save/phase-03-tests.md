---
phase: 3
title: "Tests"
status: pending
priority: P1
effort: "2h"
dependencies: [1, 2]
---

# Phase 3: Tests

## Overview

Extend the existing `study-translation-popup.test.tsx` and add focused unit tests for `handleSaveVocabulary`. Cover: double-save prevention, `isNew` flag handling, error state, and popup save button icon states.

## Requirements

- Functional:
  - All new behaviour from Phase 1 + 2 has test coverage
  - Existing passing tests remain green
- Non-functional:
  - Use the project's existing test setup (Vitest + RTL + global next-intl mock)
  - No new test infrastructure needed
  - Prefer integration-style tests (render component, trigger interaction, assert UI)

## Architecture

```
Existing test files to extend:
  tests/vitest/integration/components/study/study-translation-popup.test.tsx
    — add: save button states, error state renders error hint

New test file:
  src/features/study/use-study-actions.test.ts  (already exists — extend it)
    — OR new: tests/vitest/unit/study/vocabulary-save.test.ts
    — cover: handleSaveVocabulary logic (double-save, isNew, error)

API mock:
  Use msw (check if already set up) or vi.spyOn(global, "fetch")
  Mock POST /api/vocabulary → return { data: { ...item, isNew: true/false } }
```

## Related Code Files

- Extend: `tests/vitest/integration/components/study/study-translation-popup.test.tsx`
- Extend or create: unit test for `handleSaveVocabulary` behaviour

## Implementation Steps

1. **Check existing test setup** — Read `tests/vitest/integration/components/study/study-translation-popup.test.tsx` to understand current coverage and how props are passed. Confirm `msw` or `fetch` mock pattern used.

2. **Translation popup save button tests** (in `study-translation-popup.test.tsx`):
   - `renders save button when status is success` — assert `<Bookmark>` icon + "Save" label visible
   - `shows Saved state when isSaved=true` — assert `<BookmarkCheck>` icon, button disabled
   - `shows saving spinner during save` — pass `saveStatus="saving"`, assert spinner + disabled
   - `shows error state with hint text` — pass `saveStatus="error"`, assert ✗ icon + `saveErrorHint` text
   - `calls onSave when idle button clicked` — assert callback fired once
   - `does not call onSave when button disabled (saving/saved)` — assert callback not fired

3. **`handleSaveVocabulary` unit tests**:
   - `prevents double-save: second call while saving is a no-op` — mock fetch with delayed response, call twice, assert fetch called once
   - `adds to savedVocabularyIds only when isNew=true` — mock response with `isNew: false`, assert Set unchanged
   - `adds to savedVocabularyIds when isNew=true` — mock response with `isNew: true`, assert Set updated
   - `sets vocabSaveStatus to "error" on failed fetch` — mock fetch rejection, assert status is "error"
   - `resets isSavingVocabulary to false after error` — assert finally block runs

4. **API contract test** (optional, if `translation-response-schema.ts` has tests):
   - Assert vocabularyResponseSchema accepts `{ data: { ...fields, isNew: boolean } }`

5. Run full test suite: `pnpm run test && pnpm run typecheck && pnpm run lint`

## Success Criteria

- [ ] Save button states (idle/saving/saved/error) covered in popup tests
- [ ] Double-save prevention covered (fetch called exactly once on concurrent calls)
- [ ] `isNew: false` response does not update `savedVocabularyIds`
- [ ] Error path sets `vocabSaveStatus = "error"` and `isSavingVocabulary = false`
- [ ] `pnpm run test` green (no regressions)
- [ ] `pnpm run typecheck` clean
- [ ] `pnpm run lint` clean

## Risk Assessment

- **msw vs fetch spy** — check which pattern the existing popup test uses and match it. Don't introduce msw if it's not already in the test setup.
- **next-intl in popup test** — the global mock in `vitest.setup.ts` handles this; just use `render()` normally.
