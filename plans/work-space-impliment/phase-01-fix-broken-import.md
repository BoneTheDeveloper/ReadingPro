---
phase: 1
title: "Fix broken import"
status: pending
priority: P1
effort: "15m"
dependencies: []
---

# Phase 1: Fix broken import

## Overview

Fix the broken build caused by `use-studio-artifacts.ts` importing a deleted type file. Since `StudyState` will be removed entirely (phase 5), this phase accepts the broken state as-is and removes the unused import.

## Context Links

- Related: `src/features/studio-panel/hooks/use-studio-artifacts.ts`

## Requirements

- Functional: `use-studio-artifacts.ts` must compile without errors
- Non-functional: No `@ts-ignore`, no dead imports

## Architecture

The `use-studio-artifacts.ts` file imports `StudyState` from `@/types/study-state` which doesn't exist. Since the hook will be replaced by `useStudioArtifactQuery` in phase 5, the simplest fix is to:

1. Remove the `StudyState` type import
2. Inline the minimal type alias needed for the hook's props

## Related Code Files

- **Modify:** `src/features/studio-panel/hooks/use-studio-artifacts.ts`

## Implementation Steps

1. Read `src/features/studio-panel/hooks/use-studio-artifacts.ts`
2. Remove `import type { StudyState } from "@/types/study-state"`
3. Add inline type alias at the top of the file:
   ```ts
   // Inline type alias — will be removed when this hook is replaced in phase 5
   type ArtifactsState = Record<string, { status: string; data: unknown[]; fetchedAt?: number }>;
   ```
4. Run `pnpm typecheck` to confirm zero errors
5. Add `// @deprecated — replaced by useStudioArtifactQuery in phase 5` comment to the file

## Success Criteria

- [ ] `pnpm typecheck` passes with zero errors in `use-studio-artifacts.ts`
- [ ] No `@ts-ignore` added
- [ ] Inline type alias in place of deleted import

## Risk Assessment

- **Risk:** Low — inline type alias, minimal change
- **Mitigation:** This file will be replaced entirely in phase 5. This is just a build-fix to unblock development.
