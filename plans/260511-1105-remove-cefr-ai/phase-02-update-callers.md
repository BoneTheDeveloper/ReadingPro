---
phase: 2
title: Update Callers
status: completed
priority: P1
effort: 15m
dependencies:
  - 1
---

# Phase 2: Update Callers

## Overview

Replace AI CEFR detection + heuristic fallback pattern with direct `getHeuristicCEFR()` call in both upload action files.

## Related Code Files

- Modify: `src/app/actions/analyze.ts` — remove AI call, use heuristic directly
- Modify: `src/app/actions/study-upload-action.ts` — remove AI call, use heuristic directly

## Implementation Steps

### `analyze.ts`

1. Remove import of `detectCEFRLevel` and `getHeuristicCEFR` from `@/lib/ai/cefr-detector`
2. Add import: `import { getHeuristicCEFR } from '@/lib/shared/cefr-utils'`
3. Replace lines 30-40 (AI call + try/catch + fallback) with single line: `originalLevel = getHeuristicCEFR(truncatedText)`
4. Remove `Sentry.startSpan` wrapping for CEFR detection (no more async AI call)
5. Remove `Sentry.addBreadcrumb` for CEFR detection (optional — or change to "Computing CEFR level")

### `study-upload-action.ts`

1. Remove import of `detectCEFRLevel` from `@/lib/ai/cefr-detector`
2. Add import: `import { getHeuristicCEFR } from '@/lib/shared/cefr-utils'` (may already exist via cefr-utils)
3. Replace lines 40-51 (AI call + try/catch + fallback) with: `originalLevel = getHeuristicCEFR(text)`
4. Remove Sentry span wrapping for CEFR detection
5. Keep the `log.info` for CEFR detection timing

## Success Criteria

- [ ] No imports from `@/lib/ai/cefr-detector` in either file
- [ ] `getHeuristicCEFR` imported from `@/lib/shared/cefr-utils`
- [ ] No async CEFR detection — synchronous call
- [ ] Both files compile (`npx tsc --noEmit`)
