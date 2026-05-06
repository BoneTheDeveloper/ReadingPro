---
title: "Phase 03: Schema Validation Fixes"
description: "Fix correctAnswer constraint (H2), simplifiedText max (H4), getHeuristicCEFR return type (M2), delete parsePassageLines (M1)"
status: pending
priority: P1
effort: 0.5h
branch: main
tags: [validation, types]
created: 2026-05-06
---

## Overview

Fix schema and typing issues: correctAnswer validation gap, unbounded simplifiedText, bare string return type, dead code.

## Issues Fixed

### H2: correctAnswer Validation Gap
**File:** `src/lib/ai/question-generator.ts`
**Problem:** `correctAnswer: z.string()` with no constraint linking to `options[].id`. AI could return `correctAnswer: "Z"` when options have ids `["A","B","C","D"]`, making quiz unanswerable.
**Fix:** Add `.refine()` that validates `correctAnswer` is one of the `options[].id` values.

```typescript
export const generatedQuestionSchema = z.object({
  questionText: z.string(),
  options: z.array(questionOptionSchema).min(2),
  correctAnswer: z.string(),
  sourceText: z.string(),
  sourceLine: z.number().int().positive(),
  explanation: z.string(),
  questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE']),
  difficulty: z.number().int().min(1).max(5),
}).refine(
  (q) => q.options.some(opt => opt.id === q.correctAnswer),
  { message: 'correctAnswer must match one of the option ids', path: ['correctAnswer'] }
);
```

### H4: Unbounded simplifiedText Length
**File:** `src/lib/ai/content-simplifier.ts`
**Problem:** `simplifiedText: z.string()` has no upper bound. AI could return extremely long text.
**Fix:** Add `.max()` constraint.

```typescript
export const simplifiedContentSchema = z.object({
  simplifiedText: z.string().max(15000, 'Simplified text must be under 15000 characters'),
  changes: z.array(z.string()),
  retainedKeyTerms: z.array(z.string()),
});
```

Max of 15000 accounts for: 10K input (truncated) + expansion during simplification at simpler levels (more words, shorter words). Generous ceiling.

### M2: getHeuristicCEFR Returns Bare string
**File:** `src/lib/ai/cefr-detector.ts`
**Problem:** Returns `string` instead of `CEFRLevel`. Callers must cast with `as CEFRLevel`.
**Fix:** Import `CEFRLevel` from `@/lib/shared/cefr-utils` and set return type.

```typescript
import type { CEFRLevel } from '@/lib/shared/cefr-utils';

export function getHeuristicCEFR(text: string): CEFRLevel {
  // ... existing logic, already returns valid CEFRLevel values
}
```

No runtime change needed -- function already returns only valid CEFR levels. Type-only fix.

### M1: Dead parsePassageLines Function
**File:** `src/lib/ai/question-generator.ts`
**Problem:** `parsePassageLines` is exported but never called anywhere.
**Fix:** Delete the function entirely.

## Files to Modify

- `src/lib/ai/question-generator.ts` -- correctAnswer refine, delete parsePassageLines
- `src/lib/ai/content-simplifier.ts` -- simplifiedText max
- `src/lib/ai/cefr-detector.ts` -- CEFRLevel return type on getHeuristicCEFR

## Implementation Steps

1. In `question-generator.ts`: add `.refine()` to `generatedQuestionSchema`, delete `parsePassageLines` function
2. In `content-simplifier.ts`: add `.max(15000)` to `simplifiedText`
3. In `cefr-detector.ts`: import `CEFRLevel`, set return type on `getHeuristicCEFR`
4. Update callers that cast `getHeuristicCEFR` result -- remove `as CEFRLevel` casts in `study-upload-action.ts:70` and `analyze.ts:105/232`

## Todo List

- [ ] Add `.refine()` to `generatedQuestionSchema` in `question-generator.ts`
- [ ] Delete `parsePassageLines` from `question-generator.ts`
- [ ] Add `.max(15000)` to `simplifiedText` in `content-simplifier.ts`
- [ ] Add `CEFRLevel` return type to `getHeuristicCEFR` in `cefr-detector.ts`
- [ ] Remove `as CEFRLevel` casts in action files that call `getHeuristicCEFR`

## Success Criteria

- `correctAnswer` is validated against `options[].id` by Zod schema
- `simplifiedText` has `.max(15000)` constraint
- `getHeuristicCEFR` returns `CEFRLevel` type (not `string`)
- `parsePassageLines` deleted
- No `as CEFRLevel` casts remain in action files for heuristic results
