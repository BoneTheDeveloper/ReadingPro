---
phase: 3
title: "Client types & tests"
status: pending
priority: P2
effort: "1.5h"
dependencies: [2]
---

# Phase 3: Client types & tests

## Overview

Pass the client-generated `artifactId` into generation, drop client-side `content` remnants,
align types, and update tests/fixtures to the new contract. Close with full verification.

## Requirements

- Functional: `handleActionClick` sends its `artifactId` to `generateStudyQuestions`; quiz detail
  still renders from `artifactDetailById[artifactId]`.
- Non-functional: typecheck/lint/tests green.

## Architecture

`handleActionClick` already mints `crypto.randomUUID()` and creates the artifact row. Now also pass
that id into question generation so the inserted questions carry it. Detail cache is already keyed by
`artifactId`, so no cache-shape change.

## Related Code Files

- Modify: `src/features/study/api/study-questions-client.ts`
  - `generateStudyQuestions({ passageId, artifactId })` — add `artifactId` to payload.
- Modify: `src/features/study/hooks/use-study-actions.ts`
  - `generateQuizArtifact(passageId, artifactId)` passes `artifactId` to `generateStudyQuestions`.
  - `studyCompleteArtifactAction({ artifactId })` — drop `content: null` arg.
- Modify: `src/features/study/model/types.ts`
  - Re-export trimmed `StudioArtifactType`; ensure no `StudioArtifactContent` re-export.
  - `StudioActionId` stays `quiz | flashcard | chat | translate` (panel actions ≠ artifact types).
- Modify: `src/features/study/hooks/use-study-actions.test.ts`
  - Update `generateStudyQuestions` mock expectations to include `artifactId`; drop `content` from complete-action asserts.
- Modify: `tests/vitest/fixtures/ui.ts` — fixture already `type: "quiz"`; verify no `content` field.
- Check: `studio-panel.tsx` `artifactMeta` — remove `chat` entry if `StudioArtifactType` no longer includes it.

## Implementation Steps

1. Add `artifactId` to client generation call + hook.
2. Drop `content` arg from `studyCompleteArtifactAction` call site.
3. Reconcile `model/types.ts` exports and `studio-panel.tsx` `artifactMeta` with trimmed type union.
4. Update `use-study-actions.test.ts` + fixtures.
5. Full verification: `db:generate`, `typecheck`, `lint`, targeted vitest, `test`.

## Success Criteria

- [ ] `generateStudyQuestions` payload includes `artifactId`; hook passes it.
- [ ] No `content` arguments at any `studyCompleteArtifactAction` call site.
- [ ] `artifactMeta` covers exactly the live `StudioArtifactType` members.
- [ ] `pnpm run typecheck` + `pnpm run lint` clean.
- [ ] `pnpm exec vitest src/features/study/hooks/use-study-actions.test.ts` green.
- [ ] `pnpm run test` green.

## Risk Assessment

- **artifactMeta lookup miss:** panel falls back to a default meta on unknown type, so a stale `chat`
  entry is harmless but misleading — remove it to keep types honest.
- **Stale detail cache across regen:** new artifact = new id = fresh cache entry; no cross-contamination.
