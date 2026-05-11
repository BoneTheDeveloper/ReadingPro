---
phase: 3
title: Delete Old Module
status: completed
priority: P1
effort: 5m
dependencies:
  - 2
---

# Phase 3: Delete Old Module

## Overview

Delete `src/lib/ai/cefr-detector.ts` and verify no remaining imports reference it.

## Related Code Files

- Delete: `src/lib/ai/cefr-detector.ts`

## Implementation Steps

1. Delete `src/lib/ai/cefr-detector.ts`
2. Grep for any remaining `cefr-detector` imports across codebase: `grep -r "cefr-detector" src/`
3. If any found — update to import from `@/lib/shared/cefr-utils` instead

## Success Criteria

- [ ] `src/lib/ai/cefr-detector.ts` deleted
- [ ] `grep -r "cefr-detector" src/` returns zero results
- [ ] `npx tsc --noEmit` passes
