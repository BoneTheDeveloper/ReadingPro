---
phase: 4
title: "Create useContentState hook"
status: completed
priority: P2
effort: "2h"
dependencies: ["phase-01-fix-broken-import"]
---

# Phase 4: Create useContentState hook

## Overview

Extract translation logic from `StudyWorkspace` into a new `useContentState` hook. ContentPanel becomes self-contained for the reading flow.

## Context Links

- Design: `plans/brainstorm-reports/260721-study-workspace-panel-state-design.md`
- Related: `src/features/reading/components/content-panel.tsx`
- Related: `src/features/reading/components/translation-popup.tsx`

## Requirements

- Functional: Translation selection, quick translate API call, vocabulary save, view mode toggle all work identically after move
- Non-functional: No duplicate state, no prop drilling

## Architecture

```
src/features/reading/hooks/use-content-state.ts   ← NEW

useContentState({ passageId }) {
  // State
  viewMode: "passage" | "pdf" | "video"       ← moved from workspace
  selection: TranslationSelection | null        ← moved from workspace
  quickTranslationState: { requestId, data, status } ← moved from workspace
  savedVocabularyIds: Set<string>               ← moved from workspace

  // Derived
  isVocabularySaved: boolean                  ← computed

  // Callbacks
  handleSelectionChange(sel): void
  handleQuickTranslate(): void
  handleSaveVocabulary(): void

  // Effects
  - Clear stale selection on passageId change
  - Fetch /api/translate on quick translate
  - saveVocabularyAction on vocab save

  // Returns
  { viewMode, setViewMode, selection, quickTranslationState, savedVocabularyIds,
    isVocabularySaved, handleSelectionChange, handleQuickTranslate, handleSaveVocabulary }
```

Key behavior preserved:
- Single-word check (word count > 1 → ignore)
- `isTranslateTextWithinLimit` check
- Translation context clamping via `clampTranslationContext`
- `requestId` counter for stale response dedup
- `buildTranslationSelectionKey` for vocab save deduplication

## Related Code Files

- **Create:** `src/features/reading/hooks/use-content-state.ts`
- **Modify:** `src/features/reading/components/content-panel.tsx`
- **Modify:** `src/app/[locale]/(dashboard)/study/_components/study-workspace.tsx`

## Implementation Steps

1. Create `src/features/reading/hooks/use-content-state.ts`:
   - Copy all translation state from `study-workspace.tsx`
   - Copy all translation callbacks
   - Copy stale-clear effect (prevPassageId / prevViewMode pattern)
   - Accept `{ passageId }` param
   - Return `{ viewMode, setViewMode, selection, quickTranslationState, savedVocabularyIds, isVocabularySaved, handleSelectionChange, handleQuickTranslate, handleSaveVocabulary }`
2. Update `content-panel.tsx`:
   - Call `useContentState({ passageId: passage?.id })`
   - Remove `onViewModeChange` from props — `viewMode` is now internal
   - Keep `error` prop (workspace owns error state)
   - Render `TranslationPopup` using hook's return values
3. Update `study-workspace.tsx`:
   - Remove translation state and callbacks
   - Remove `TranslationPopup` JSX
   - Pass `error={state.error}` to ContentPanel
4. Verify `pnpm typecheck`

## Success Criteria

- [ ] `use-content-state.ts` exists with all translation logic
- [ ] `ContentPanel` receives only `passage` and `error` as props
- [ ] `TranslationPopup` renders on word selection
- [ ] Quick translate calls `/api/translate`
- [ ] Vocabulary save calls `saveVocabularyAction`
- [ ] View mode toggle works
- [ ] `pnpm typecheck` passes

## Risk Assessment

- **Risk:** Medium — moving state + effects across files
- **Mitigation:** Exact same logic, just moved. The `passageId` param for stale-clear must match ContentPanel's `key` prop.
