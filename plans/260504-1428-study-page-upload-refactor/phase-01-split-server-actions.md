---
title: "Phase 1: Split Server Actions"
description: "Split studyAnalyzeAction into 3 independent server actions"
status: pending
priority: P1
effort: 2h
branch: main
tags: [server-actions, pipeline]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Current file: `src/app/actions/analyze.ts`
- AI modules: `src/lib/ai/cefr-detector.ts`, `src/lib/ai/content-simplifier.ts`, `src/lib/ai/question-generator.ts`
- DB client: `src/lib/db/client.ts`
- Prisma schema: `prisma/schema.prisma`

## Overview
Split the monolithic `studyAnalyzeAction` (284 lines) into 3 focused server actions. Keep existing `analyzeContentAction` and `studyAnalyzeAction` untouched for backward compat.

## Key Insights
- Current `studyAnalyzeAction` does 4 steps sequentially: CEFR detect -> simplify -> question gen -> DB save
- Each AI call is independent (simplify and questions both use the content, not each other's output)
- DB save currently bundles passage + questions in one transaction -- upload action saves passage only, questions saved separately later
- Simplify target level logic: `C2->C1, C1->B2, B2->B1, B1->A2`, skip for A1/A2

## Requirements

### Functional
- `studyUploadAction(text, title)` — CEFR detect + save passage to DB (no simplify, no questions)
- `studySimplifyAction(passageId)` — fetch passage from DB, simplify, update DB, return simplified data
- `studyGenerateQuestionsAction(passageId)` — fetch passage from DB, generate questions, save to DB, return questions

### Non-Functional
- Each action wrapped in Sentry instrumentation (same as current pattern)
- Structured logging with step timing (same as current)
- Error handling: graceful degradation, return `{ error: string }` on failure

## Architecture

### Data Flow: studyUploadAction
```
Input: { text: string, title: string }
→ Validate text length >= 50
→ Truncate to 10000 chars
→ CEFR detect (gpt-4o-mini + heuristic fallback)
→ DB: user lookup/create → passage create (no questions, no simplifiedContent)
→ Return: { passage: PassageData } | { error: string }
```

### Data Flow: studySimplifyAction
```
Input: { passageId: string }
→ DB: fetch passage by id
→ Validate passage exists
→ Calculate target level from originalLevel (skip if A1/A2)
→ Simplify (gpt-4o-mini)
→ DB: update passage set simplifiedContent, simplifiedLevel
→ Return: { simplifiedContent, simplifiedLevel } | { error: string }
```

### Data Flow: studyGenerateQuestionsAction
```
Input: { passageId: string }
→ DB: fetch passage by id (include existing questions)
→ Validate passage exists
→ Use simplifiedContent || content for question generation
→ Generate 5 questions (gpt-4o-mini)
→ DB: create questions (delete existing for this passage first? or append)
→ Return: { questions: QuestionData[] } | { error: string }
```

## Related Code Files
- **Modify:** `src/app/actions/analyze.ts` — add 3 new actions (keep existing 2)
- **Read-only:** `src/lib/ai/cefr-detector.ts`, `src/lib/ai/content-simplifier.ts`, `src/lib/ai/question-generator.ts`

## Implementation Steps

1. Add `studyUploadAction` after existing `studyAnalyzeAction`
   - Extract CEFR detection logic (lines 151-167 of current code)
   - Extract user lookup/create (lines 217-222)
   - Create passage WITHOUT simplifiedContent/questions
   - Return `PassageData` shaped object

2. Add `studySimplifyAction`
   - Accept `{ passageId: string }`
   - Fetch passage from DB (throw if not found)
   - Apply target level map logic
   - Call `simplifyContent` from `content-simplifier.ts` or inline the generateObject call
   - Update passage in DB with simplifiedContent + simplifiedLevel
   - Return `{ simplifiedContent, simplifiedLevel }`

3. Add `studyGenerateQuestionsAction`
   - Accept `{ passageId: string }`
   - Fetch passage from DB
   - Use `passage.simplifiedContent || passage.content` as input
   - Call question generation (inline generateObject or use `generateComprehensionQuestions`)
   - Delete existing questions for this passage (db.question.deleteMany)
   - Create new questions via db.question.createMany or nested create
   - Return shaped `QuestionData[]`

4. Add shared helper `getOrCreateDemoUser()` to avoid duplication across actions
   - Extract the user lookup/create pattern used in both existing actions

5. File size check: if analyze.ts exceeds 200 lines after additions, split into separate files:
   - `src/app/actions/study-upload-action.ts`
   - `src/app/actions/study-simplify-action.ts`
   - `src/app/actions/study-generate-questions-action.ts`
   - Keep original `analyze.ts` with its 2 existing actions

## Todo List
- [ ] Extract `getOrCreateDemoUser()` helper
- [ ] Implement `studyUploadAction(text, title)`
- [ ] Implement `studySimplifyAction(passageId)`
- [ ] Implement `studyGenerateQuestionsAction(passageId)`
- [ ] Verify all 3 actions compile without errors
- [ ] File size check — split into separate files if over 200 lines

## Success Criteria
- 3 new server actions exported from `analyze.ts` (or separate files)
- Each action independently callable from client components
- Sentry instrumentation on all 3
- Original `analyzeContentAction` + `studyAnalyzeAction` still compile
- No TypeScript errors

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| File exceeds 200 lines | Split into separate action files |
| Simplify called on A1/A2 text | Return `{ skipped: true }` — client hides button, this is defense-in-depth |
| Question gen called on passage with existing questions | Delete old, create new. Client warns user before calling. |
| Passage not found | Return `{ error: 'Passage not found' }` |

## Next Steps
- Phase 2: Update study-types.ts with new state fields and props interfaces
