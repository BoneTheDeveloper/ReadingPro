---
phase: 4
title: Migrate studio-panel feature schemas
status: completed
priority: P2
effort: 1h
---

# Phase 4: Migrate studio-panel feature schemas

## Overview

Migrate schemas in `src/features/studio-panel/schemas/` to follow conventions.

## Requirements

- Functional:
  - `question.ts`: Convert `generatedStudyQuestionSchema` to `interface GeneratedStudyQuestionDto`
  - `ai-chat.ts`: Rename `studyChatHistoryDataSchema` to `StudyChatHistoryDto` (interface)
  - Keep `*InputSchema` as Zod schemas

- Non-functional:
  - All imports updated
  - No TypeScript errors

## Related Code Files

- Modify: `src/features/studio-panel/schemas/question.ts`
- Modify: `src/features/studio-panel/schemas/ai-chat.ts`
- Check: `src/features/studio-panel/server/actions/studio-panel.ts`
- Check: `src/features/studio-panel/server/services/*.ts`

## Implementation Steps

### question.ts

1. **Convert output schema to interface**
   - `generatedStudyQuestionSchema` → `interface GeneratedStudyQuestionDto`
   - Remove `z.infer<>` type export

2. **Keep these as-is (already correct)**
   - `generateStudioQuestionsInputSchema` (input schema)
   - `questionOptionSchema` (shared shape, used as input)
   - `generatedQuestionSchema` (AI output validation)
   - `questionDataSchema` (DB persistence shape)
   - `questionGenerationDataSchema` (if used for AI response)

### ai-chat.ts

1. **Rename data schema to DTO**
   - `studyChatHistoryDataSchema` → `interface StudyChatHistoryDto`

2. **Keep these as-is (already correct)**
   - `studyChatRequestSchema` (input)
   - `studyChatQuerySchema` (query params)
   - `uiMessageSchema` (shared shape)

3. **Update imports**
   - Find all usages and update type references

## Success Criteria

- [ ] All output types use `interface *Dto`
- [ ] All input schemas use `*InputSchema` or `*QuerySchema` suffix
- [ ] All imports updated, `pnpm run typecheck` passes

## Risk Assessment

- Low risk: straightforward rename + interface conversion
- Mitigation: grep to find all usages first
