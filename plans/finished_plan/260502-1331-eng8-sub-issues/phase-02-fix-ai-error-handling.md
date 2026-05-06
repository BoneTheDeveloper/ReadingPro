# Phase 2: Fix AI Pipeline Error Handling (ENG-33 + ENG-34)

**Priority:** High | **Effort:** M | **Status:** pending
**Linear:** [ENG-33](https://linear.app/english-reading-app/issue/ENG-33), [ENG-34](https://linear.app/english-reading-app/issue/ENG-34)

## Context

After Phase 1 refactor, `studyAnalyzeAction` is the single analysis path. Two related bugs remain:

- **ENG-33:** AI calls fail silently — passage saved with 0 questions, right panel empty
- **ENG-34:** No user notification when analysis partially/fully fails — spinner → "ready" with no warning

## Root Cause Analysis

In `studyAnalyzeAction` (`src/app/actions/analyze.ts`):
1. CEFR detection fails → heuristic fallback (OK)
2. Simplification fails → `simplifiedContent = null`, continues silently
3. Question generation fails → `questions = []`, continues silently
4. Passage saved with 0 questions → right panel shows empty state

**Possible Gemini failure causes:**
- `generateObject()` schema mismatch with AI SDK v6 + Zod v4
- Model name `gemini-1.5-flash` compatibility
- API key quota/rate limit (3 sequential calls)
- Schema too strict (required arrays AI may not generate reliably)

## Requirements

### ENG-33 — Server-side fixes
- Log actual error objects (not just "failed") for each AI call
- Investigate and fix `generateObject()` failures
- If question generation fails, return error to client (not empty array)
- Validate happy path returns questions correctly

### ENG-34 — Client-side fixes
- Show clear error messages when analysis fails
- Distinguish: partial failure (questions but no simplification) vs full failure
- Add retry button for failed analysis
- Never transition to "ready" with 0 questions silently

## Files to Modify

| File | Action |
|---|---|
| `src/app/actions/analyze.ts` | Fix error handling in `studyAnalyzeAction` |
| `src/app/(dashboard)/study/study-page-client.tsx` | Handle error/partial-failure states |
| `src/app/(dashboard)/study/study-left-panel.tsx` | Show error UI, retry button |
| `src/app/(dashboard)/study/study-right-panel.tsx` | Show meaningful empty state message |
| `src/lib/ai/cefr-detector.ts` | Verify schema compatibility (read-only check) |
| `src/lib/ai/content-simplifier.ts` | Verify schema compatibility (read-only check) |
| `src/lib/ai/question-generator.ts` | Verify schema compatibility (read-only check) |

## Implementation Steps

### Step 1: Investigate AI module schemas (read-only)
- Read `src/lib/ai/question-generator.ts` — check `generateObject()` call, Zod schema, model name
- Read `src/lib/ai/content-simplifier.ts` — same checks
- Read `src/lib/ai/cefr-detector.ts` — same checks
- Check AI SDK v6 + Zod v4 compatibility (import patterns, schema format)
- Check `package.json` for exact versions of `ai`, `@ai-sdk/google`, `zod`

### Step 2: Fix `studyAnalyzeAction` error handling
For each AI step (CEFR, simplify, questions):
- Log full error object with `logger.error()` (not just `logger.warn()`)
- Wrap in Sentry span for tracing
- On question generation failure: throw/return error instead of `questions = []`
- On simplification failure: set `simplifiedContent = null` but include warning in response

Return shape update:
```typescript
// Add to return type
{
  passage: PassageData;
  questions: QuestionData[];
  warnings?: string[];  // e.g. ["Simplification failed — showing original only"]
}
```

### Step 3: Validate question generation works
- Run `studyAnalyzeAction` with test text locally
- If Gemini fails, debug the actual error:
  - Check schema: are required fields too strict?
  - Try relaxing schema (optional fields, defaults)
  - Try different model name if needed
  - Check API key and quota

### Step 4: Add client-side error states
Update `StudyState` in `study-page-client.tsx`:
```typescript
type StudyStatus = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'partial-error' | 'error';
```

- `partial-error`: analysis ran but some steps failed (e.g. questions generated but no simplification)
- `error`: critical failure (no questions generated)

### Step 5: Update left panel error UI
- Show specific error message (not generic "Something went wrong")
- Show retry button that re-triggers `studyAnalyzeAction`
- Distinguish: upload error vs analysis error vs partial failure

### Step 6: Update right panel empty state
- If `questions.length === 0` and status is `ready`: show "Analysis couldn't generate questions. Please try again."
- Link to retry action from parent

### Step 7: Verify
- `npm run build` passes
- Happy path: upload → analyze → reading + questions (5 questions shown)
- Error path: simulate AI failure → error message + retry button shown
- Partial failure: questions generated but no simplification → warning shown, questions still work

## Acceptance Criteria

- [ ] Detailed error logging for each AI call (actual error objects)
- [ ] Gemini `generateObject()` failures investigated and fixed
- [ ] Question generation failure → error returned to client (not empty array)
- [ ] Happy path validates questions returned correctly
- [ ] User sees clear error message on analysis failure
- [ ] Retry button available after failure
- [ ] Partial failure (no simplification) shows warning but continues
- [ ] Build passes

## Risks

- Gemini API issues may be external (quota, model changes) — need graceful handling regardless
- Schema relaxation may produce lower quality AI output — balance strictness vs reliability
