---
phase: 0
title: "Fix pre-existing broken imports"
status: completed
priority: P1
effort: "30m"
dependencies: []
---

# Phase 0: Fix pre-existing broken imports

## Overview

`pnpm run typecheck` currently fails with 6 pre-existing errors (baseline, unrelated to this
plan's file moves) — leftover from an earlier, incomplete restructure
(`plans/20260706-1751-src-feature-colocation-restructure/`, phase 13-14 marked "complete" but
never fully executed). 5 consumer files import paths that were never created. Fix by repointing
imports to the files that actually exist on disk today. No new files/folders created in this
phase — that only happens in Phase 1+.

## Requirements

- Functional: `pnpm run typecheck` passes with zero errors before Phase 1 starts.
- Non-functional: no logic changes, only import path corrections.

## Related Code Files

- Modify:
  - `src/app/[locale]/(dashboard)/study/_components/study-workspace-client.tsx`
  - `src/app/[locale]/(dashboard)/study/_hooks/use-study-actions.ts`
  - `src/features/reading/db/inline-translate.service.ts`
  - `src/features/source-panel/ui/upload-modal.tsx`
  - `src/features/study/shared/types.ts`

## Implementation Steps

1. `study-workspace-client.tsx` line 6: `@/features/reading/schemas/translation-response.schema` → `@/features/reading/translation.schema` (exports `translateResponseSchema` — verified present).
2. `study-workspace-client.tsx` line 11: `@/features/reading/schemas/translation-limits` → `@/features/reading/lib/translation-limits` (exports `clampTranslationContext`, `isTranslateTextWithinLimit` — verified present).
3. `use-study-actions.ts` line 6: `@/features/studio-panel/api-client/studio-questions-client` → `@/features/studio-panel/studio-questions-client` (exports `generateStudioQuestions` — verified present).
4. `inline-translate.service.ts` line 5: `@/features/reading/schemas/text-utils` → `@/features/reading/lib/text-utils` (exports `TranslateResolutionSource` — verified present).
5. `upload-modal.tsx` line 15: `@/features/source-panel/api-client/upload-client` → `@/features/source-panel/upload-client` (exports `uploadFile`, `uploadText` — verified present).
6. `study/shared/types.ts` line 1: `@/features/reading/schemas/translation-response.schema` → `@/features/reading/translation.schema` (exports `TranslationData` — verified present).
7. Run `pnpm run typecheck` — must exit 0.

## Success Criteria

- [x] All 6 import paths above point to files that exist on disk
- [x] `pnpm run typecheck` passes with zero errors
- [x] No behavior change — only import paths edited

## Risk Assessment

Low risk — pure import path correction, target files and exports already verified to exist.
Must run before Phase 1, since Phase 1 moves one of the same files (`translation.schema.ts`)
and a dirty baseline would make it impossible to tell which typecheck errors are pre-existing
vs newly introduced.
