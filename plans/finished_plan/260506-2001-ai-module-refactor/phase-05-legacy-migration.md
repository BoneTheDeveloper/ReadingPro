---
title: "Phase 05: Legacy Action Migration"
description: "Migrate analyzeContentAction and studyAnalyzeAction in analyze.ts to use module functions"
status: pending
priority: P2
effort: 0.5h
branch: main
tags: [refactor, DRY]
created: 2026-05-06
---

## Overview

Migrate the legacy `analyzeContentAction` and `studyAnalyzeAction` in `analyze.ts` to use the module functions instead of inline `generateObject` calls. These are called from `api/upload/route.ts` and `api/upload/text/route.ts`.

## Prerequisites

- Phase 02 complete (module functions are live and working)

## Current State

`analyze.ts` has TWO functions:
1. `analyzeContentAction(formData: FormData)` -- legacy, called from API routes
2. `studyAnalyzeAction({ text, title })` -- newer, not called externally (only self-referenced)

Both contain the same inline `generateObject` pattern with bare prompts and no system prompts.

**Note:** `studyAnalyzeAction` is NOT called from any API route or client component. Only `analyzeContentAction` has external callers (2 API routes). `studyAnalyzeAction` is effectively dead code too. Consider deleting it.

## Decision: Delete studyAnalyzeAction

`studyAnalyzeAction` has ZERO callers outside `analyze.ts`. The study page now uses the split actions (`study-upload-action`, `study-simplify-action`, `study-generate-questions-action`). This function is dead code.

**Action:** Delete `studyAnalyzeAction` entirely. Keep `analyzeContentAction` with module function calls.

## Files to Modify

### `src/app/actions/analyze.ts`

1. Replace inline CEFR `generateObject` (line 34-40) with `detectCEFRLevel(text)`
2. Replace inline simplification `generateObject` (line 56-62) with `simplifyContent(text, targetLevel)`
3. Replace inline question `generateObject` (line 77-84) with `generateComprehensionQuestions(content, 5)`
4. Remove unused imports: `generateObject`, `openai`, `cefrAnalysisSchema`, `simplifiedContentSchema`, `questionGenerationSchema`
5. Add imports: `detectCEFRLevel`, `simplifyContent`, `generateComprehensionQuestions`
6. Delete entire `studyAnalyzeAction` function (lines 134-283)
7. Remove `getOrCreateDemoUser` -- use `study-shared.ts` version

## Implementation Steps

1. Replace CEFR detection block:
   ```typescript
   // Before
   const { object: cefrResult } = await Sentry.startSpan(..., async () => {
     return generateObject({ model: openai('gpt-4o-mini'), schema: cefrAnalysisSchema, prompt: `...${text}` });
   });
   originalLevel = cefrResult.level;

   // After
   const cefrResult = await Sentry.startSpan({ name: 'ai:cefr-detect', op: 'ai' }, async () => {
     return detectCEFRLevel(truncatedText);
   });
   originalLevel = cefrResult?.level ?? null;
   ```

2. Replace simplification block similarly with `simplifyContent(truncatedText, targetLevel)`

3. Replace question generation with `generateComprehensionQuestions(contentToAnalyze, 5)`

4. Delete `studyAnalyzeAction` function entirely

5. Clean up imports:
   - Remove: `generateObject`, `openai`, `cefrAnalysisSchema`, `simplifiedContentSchema`, `questionGenerationSchema`, `type QuestionGenerationResult`
   - Add: `detectCEFRLevel`, `simplifyContent`, `generateComprehensionQuestions`
   - Keep: `getHeuristicCEFR` (still used as fallback)

6. Replace inline demo user creation with `getOrCreateDemoUser` from `study-shared.ts`

## Todo List

- [ ] Replace inline CEFR detection with `detectCEFRLevel`
- [ ] Replace inline simplification with `simplifyContent`
- [ ] Replace inline question generation with `generateComprehensionQuestions`
- [ ] Delete `studyAnalyzeAction` function
- [ ] Clean up imports
- [ ] Use `getOrCreateDemoUser` from shared module
- [ ] Verify `analyzeContentAction` still returns `{ passageId, originalLevel, simplifiedLevel, questionCount }`

## Success Criteria

- `analyzeContentAction` uses module functions (no inline `generateObject`)
- `studyAnalyzeAction` deleted
- `api/upload/route.ts` and `api/upload/text/route.ts` still work unchanged
- No `generateObject` or `openai` imports remain in `analyze.ts`
- File is well under 200 LOC
