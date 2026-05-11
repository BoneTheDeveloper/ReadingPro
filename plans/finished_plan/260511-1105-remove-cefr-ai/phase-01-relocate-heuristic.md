---
phase: 1
title: Relocate Heuristic
status: completed
priority: P1
effort: 10m
dependencies: []
---

# Phase 1: Relocate Heuristic

## Overview

Move `getHeuristicCEFR()` from `src/lib/ai/cefr-detector.ts` to `src/lib/shared/cefr-utils.ts`.

## Related Code Files

- Modify: `src/lib/shared/cefr-utils.ts` — add `getHeuristicCEFR()` function

## Implementation Steps

1. Open `src/lib/shared/cefr-utils.ts`
2. Add `getHeuristicCEFR(text: string): CEFRLevel` function — copy verbatim from `cefr-detector.ts:38-50`
3. No import changes needed — `CEFRLevel` type already defined in this file

## Success Criteria

- [ ] `getHeuristicCEFR` exported from `src/lib/shared/cefr-utils.ts`
- [ ] Function logic identical to original (no changes)
- [ ] File compiles (`npx tsc --noEmit`)
