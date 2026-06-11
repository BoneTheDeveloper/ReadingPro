---
phase: 1
title: "Replace ArtifactItem types with passage-scoped StudioResult/ResultsCacheEntry"
status: pending
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Replace ArtifactItem types with passage-scoped StudioResult/ResultsCacheEntry

## Overview

Replace `StudioItem`, `ArtifactType`, `ArtifactStatus`, `ArtifactData` with passage-scoped types: `StudioResult`, `ResultsCacheEntry`, and per-passage viewing refs. Update `StudyState` to remove global `viewingArtifactId` and add `resultsByPassageId` + `viewingResultByPassageId`.

## Requirements

- Keep `StudioResult` as a **view model only** — no DB table needed
- `ResultsCacheEntry` must track fetch status, data, timestamp, and error
- `StudyState` must be backward-compatible with existing workspace state tests

## Architecture

```
StudioResult (UI view model)
  ├── id: string
  ├── type: "quiz" | "summary" | "chat" | "flashcard" | "mindmap"
  ├── passageId: string
  ├── title: string
  ├── status: "running" | "completed" | "error"
  ├── createdAt: string
  └── updatedAt?: string

ResultsCacheEntry
  ├── status: "idle" | "loading" | "success" | "error"
  ├── data: StudioResult[]
  ├── fetchedAt?: number
  └── error?: string

ResultRef
  ├── type: StudioResult["type"]
  └── id: string

StudyState (updated)
  ├── resultsByPassageId: Record<string, ResultsCacheEntry>
  └── viewingResultByPassageId: Record<string, ResultRef | null>
```

## Related Code Files

- Modify: `src/features/study/study-types.ts`

## Implementation Steps

1. Remove `ArtifactType`, `ArtifactStatus`, `ArtifactData`, `StudioItem` types
2. Add `StudioResult` type
3. Add `ResultsCacheEntry` type
4. Add `ResultRef` type
5. Update `StudyState`:
   - Remove `viewingArtifactId: string | null`
   - Remove `questions: QuestionData[]` (questions will live inside cache detail, not global state)
   - Remove `generatingQuestions: boolean`
   - Add `resultsByPassageId: Record<string, ResultsCacheEntry>`
   - Add `viewingResultByPassageId: Record<string, ResultRef | null>`
6. Export a `RESULT_STALE_TIME = 60_000` constant

## Success Criteria

- [ ] No `StudioItem`, `ArtifactType`, `ArtifactStatus`, `ArtifactData` exports remain
- [ ] `StudioResult`, `ResultsCacheEntry`, `ResultRef` are exported
- [ ] `StudyState` has no `viewingArtifactId`, has `resultsByPassageId` and `viewingResultByPassageId`
- [ ] TypeScript compiles without errors (some consumers will break — fixed in later phases)

## Risk Assessment

**Breaking change** — all consumers of `StudioItem` and `viewingArtifactId` will fail to compile. This is intentional; phases 3-4 fix the consumers.
