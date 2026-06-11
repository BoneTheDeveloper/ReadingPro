---
phase: 4
title: "Rewire right-panel and page-client to consume passage-scoped results"
status: pending
priority: P1
effort: "1.5h"
dependencies: [3]
---

# Phase 4: Rewire right-panel and page-client to consume passage-scoped results

## Overview

Update `StudyStudioPanel` props and rendering to consume `ResultsCacheEntry` + `ResultRef` instead of `StudioItem[]` + `viewingArtifactId`. Fetch detail data when user opens a result.

## Requirements

- Results list comes from `ResultsCacheEntry.data` for the active passage
- Viewing result comes from `viewingResultByPassageId[activePassageId]`
- Opening a quiz result fetches questions if not cached in `resultDetailById`
- Opening a summary result reads from passage's `simplifiedContent`/`simplifiedLevel`
- Loading/error states from `ResultsCacheEntry.status` shown in the panel

## Architecture

### Updated props for StudyStudioPanel

```typescript
interface StudyStudioPanelProps {
  resultsCache: ResultsCacheEntry           // resultsByPassageId[activePassageId]
  activePassage: PassageData | null
  hasActivePassage: boolean
  simplifying: boolean
  viewingResult: ResultRef | null           // viewingResultByPassageId[activePassageId]
  onSetViewingResult: (ref: ResultRef | null) => void
  resultDetailById: Record<string, DetailCacheEntry>
  onLoadResultDetail: (resultId: string, type: StudioResult["type"]) => void
  onActionClick: (cardId: StudioCardId) => void
  // ... translate/chat props unchanged
}
```

### Detail fetch flow

1. User clicks a completed result in the list
2. `onSetViewingResult({ type, id })` is called
3. If `resultDetailById[id]` has no data for the type:
   - Quiz → call `studyGenerateQuestionsAction` equivalent fetch (or new fetch endpoint)
   - Summary → read from `activePassage.simplifiedContent`
4. Detail stored in `resultDetailById[id]`, panel renders from cache

### Rendering changes

- Replace `artifacts.filter(a => a.passageId === activePassage?.id)` with `resultsCache.data`
- Replace `viewingArtifactId` lookup with `viewingResult` + `resultDetailById[viewingResult.id]`
- Running indicators from `resultsCache.data.filter(r => r.status === "running")`
- Loading spinner when `resultsCache.status === "loading"`
- Error message when `resultsCache.status === "error"`

## Related Code Files

- Modify: `src/features/study/studio/right-panel.tsx`
- Modify: `src/features/study/page/page-client.tsx`
- Read: `src/features/study/studio/quiz/quiz-content.tsx` (unchanged, just receives questions)

## Implementation Steps

1. **right-panel.tsx** — Update props interface:
   - Replace `artifacts: StudioItem[]` with `resultsCache: ResultsCacheEntry`
   - Replace `viewingArtifactId` with `viewingResult: ResultRef | null`
   - Replace `onSetViewingArtifactId` with `onSetViewingResult`
   - Add `resultDetailById` and `onLoadResultDetail` props

2. **right-panel.tsx** — Update internal logic:
   - `passageArtifacts` → `resultsCache.data`
   - `viewingArtifact` → build from `viewingResult` + lookup in `resultsCache.data` + `resultDetailById`
   - `isCardLocked` → check `resultsCache.data` for running items
   - `runningCount` → filter `resultsCache.data`

3. **right-panel.tsx** — Update result detail view:
   - Quiz view: get questions from `resultDetailById[viewingResult.id]?.questions`
   - Summary view: get content from `resultDetailById[viewingResult.id]?.simplifiedContent`
   - If detail not loaded yet, show loading spinner and call `onLoadResultDetail`

4. **right-panel.tsx** — Update collapsed mode:
   - Same replacements for running/completed indicators

5. **page-client.tsx** — Update props passed to `StudyStudioPanel`:
   - `resultsCache={state.resultsByPassageId[state.activePassageId ?? ""] ?? { status: "idle", data: [] }}`
   - `viewingResult={state.activePassageId ? state.viewingResultByPassageId[state.activePassageId] ?? null : null}`
   - `onSetViewingResult` → writes to `viewingResultByPassageId[activePassageId]`
   - `resultDetailById={state.resultDetailById}`
   - `onLoadResultDetail` → fetches quiz questions or reads summary from passage

6. **page-client.tsx** — Add cache fetch effect:
   - `useEffect` watching `state.activePassageId`
   - Fetch from `/api/study-results?passageId=...` when cache is empty or stale
   - Use `AbortController` for cancellation

## Success Criteria

- [ ] Results panel shows `resultsCache.data` for the active passage
- [ ] Clicking a result opens the detail view with fetched data
- [ ] Quiz result shows `QuizContent` with fetched questions
- [ ] Summary result shows simplified content
- [ ] Running results show spinner
- [ ] Error results show error state
- [ ] Collapsed mode shows running/completed indicators correctly
- [ ] No references to `StudioItem`, `viewingArtifactId` remain

## Risk Assessment

Medium risk. Mostly mechanical prop changes. The detail fetch logic is new but simple. The cache fetch effect needs careful race-condition handling (AbortController).
