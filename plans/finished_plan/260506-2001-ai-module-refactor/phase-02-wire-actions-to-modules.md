---
title: "Phase 02: Wire Actions to Module Functions"
description: "Replace inline generateObject calls in action files with calls to module functions. Eliminates dead code + missing system prompts + DRY violation."
status: pending
priority: P1
effort: 1.5h
branch: main
tags: [refactor, DRY]
created: 2026-05-06
---

## Overview

Fix C3 + H1: Actions duplicate AI calls inline with bare prompts (no system prompts). Module functions with proper system prompts are dead code. Wire actions to modules.

## Prerequisites

- Phase 01 complete (prompt injection hardening in modules)
- Phase 03 complete (schema validation fixes in modules)
- Phase 04 complete (atomic transaction in question action)

## Current State

Each action file calls `generateObject` inline:
- `study-upload-action.ts:45-51` -- CEFR detection
- `study-simplify-action.ts:48-54` -- content simplification
- `study-generate-questions-action.ts:41-47` -- question generation

Module functions that SHOULD be called:
- `detectCEFRLevel(text)` in `cefr-detector.ts`
- `simplifyContent(text, targetLevel)` in `content-simplifier.ts`
- `generateComprehensionQuestions(passage, count)` in `question-generator.ts`

## Required Module Signature Changes

Current module functions return `T | null` and swallow errors. Actions need to distinguish "AI call succeeded" from "AI call failed" for their own error handling. Two options:

**Option: Keep null return, actions check for null.** This matches current pattern where actions already handle null/error cases.

Current actions already handle null:
- `study-upload-action.ts` falls back to heuristic when CEFR fails
- `study-simplify-action.ts` returns error when simplification fails
- `study-generate-questions-action.ts` returns error when question gen fails

Module functions already return `null` on failure. Actions already handle `null`. Signature change NOT needed.

### Adjustment: Pass Sentry Span Context

Actions wrap AI calls in `Sentry.startSpan`. Module functions don't use Sentry. Two approaches:
1. Add optional Sentry wrapper parameter to modules (invasive)
2. Accept that Sentry instrumentation stays at action level, wrapping the module call (simpler)

**Choose option 2.** Module functions handle the AI call. Actions handle Sentry spans + error recovery. Clean separation.

### Adjustment: Truncation

Actions truncate text before passing to AI (e.g., `text.slice(0, 10000)`). Module functions should NOT truncate -- caller decides what to send.

Current modules:
- `detectCEFRLevel`: truncates to 2000 internally -- **keep** (reasonable for CEFR)
- `simplifyContent`: no truncation -- **good**
- `generateComprehensionQuestions`: no truncation -- **good**

Actions will truncate before calling modules.

## Files to Modify

### `src/app/actions/study-upload-action.ts`

**Before:**
```typescript
const { object: cefrResult } = await Sentry.startSpan({ ... }, async () => {
  return generateObject({
    model: openai('gpt-4o-mini'),
    schema: cefrAnalysisSchema,
    prompt: `Analyze text and return CEFR level: ${truncatedText.slice(0, 2000)}`,
  });
});
originalLevel = cefrResult.level;
```

**After:**
```typescript
const cefrResult = await Sentry.startSpan({ name: 'ai:cefr-detect', op: 'ai' }, async () => {
  return detectCEFRLevel(truncatedText);
});
originalLevel = cefrResult?.level ?? null;
```

Remove imports: `generateObject`, `openai`, `cefrAnalysisSchema`. Add import: `detectCEFRLevel`.

### `src/app/actions/study-simplify-action.ts`

**Before:**
```typescript
const { object: simplified } = await Sentry.startSpan({ ... }, async () => {
  return generateObject({
    model: openai('gpt-4o-mini'),
    schema: simplifiedContentSchema,
    prompt: `Simplify to ${targetLevel}: ${passage.content.slice(0, 10000)}`,
  });
});
```

**After:**
```typescript
const simplified = await Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, async () => {
  return simplifyContent(passage.content.slice(0, 10000), targetLevel);
});
```

Remove imports: `generateObject`, `openai`, `simplifiedContentSchema`. Add import: `simplifyContent`.

### `src/app/actions/study-generate-questions-action.ts`

**Before:**
```typescript
const { object: questionResult } = await Sentry.startSpan({ ... }, async () => {
  return generateObject({
    model: openai('gpt-4o-mini'),
    schema: questionGenerationSchema,
    prompt: `Generate 5 comprehension questions for: ${contentToAnalyze.slice(0, 10000)}`,
  });
});
questions = questionResult.questions;
```

**After:**
```typescript
const questionResult = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
  return generateComprehensionQuestions(contentToAnalyze.slice(0, 10000), 5);
});
if (!questionResult) {
  // ... existing error handling
}
questions = questionResult.questions;
```

Remove imports: `generateObject`, `openai`, `questionGenerationSchema`. Add import: `generateComprehensionQuestions`. Keep `type QuestionGenerationResult` for type usage.

## Implementation Steps

1. Update `study-upload-action.ts`:
   - Replace inline `generateObject` with `detectCEFRLevel` call
   - Remove unused imports (`generateObject`, `openai`, `cefrAnalysisSchema`)
   - Add import for `detectCEFRLevel`
   - Keep fallback to `getHeuristicCEFR` when result is null

2. Update `study-simplify-action.ts`:
   - Replace inline `generateObject` with `simplifyContent` call
   - Remove unused imports (`generateObject`, `openai`, `simplifiedContentSchema`)
   - Add import for `simplifyContent`
   - Keep error handling for null result

3. Update `study-generate-questions-action.ts`:
   - Replace inline `generateObject` with `generateComprehensionQuestions` call
   - Remove unused imports (`generateObject`, `openai`)
   - Keep `questionGenerationSchema` import IF still used (check)
   - Add import for `generateComprehensionQuestions`
   - Keep error handling for null result
   - Transaction from Phase 04 is already in place

4. Remove dead `generateObject` and `openai` imports from all 3 action files

5. Verify: `grep -r "generateObject" src/app/actions/` returns zero matches (excluding analyze.ts)

## Todo List

- [ ] Update `study-upload-action.ts` to use `detectCEFRLevel`
- [ ] Update `study-simplify-action.ts` to use `simplifyContent`
- [ ] Update `study-generate-questions-action.ts` to use `generateComprehensionQuestions`
- [ ] Remove unused imports (`generateObject`, `openai`) from all 3 files
- [ ] Verify no inline `generateObject` calls remain in study actions

## Success Criteria

- No `generateObject` import in `study-upload-action.ts`, `study-simplify-action.ts`, `study-generate-questions-action.ts`
- No `openai` import in those files
- `detectCEFRLevel`, `simplifyContent`, `generateComprehensionQuestions` are all called (no longer dead code)
- System prompts are active (via module functions)
- Prompt injection protection active (via Phase 01 wrapping in modules)
- Schema constraints active (via Phase 03 in modules)
- All existing error handling preserved
