# Phase 3: Cleanup

## Context
Remove deprecated server action files after migration to REST API.

## Steps

### 3.1 Remove server actions
- Delete: `src/features/studio/server/action/question.ts`
- Delete: `src/features/studio/server/action/chat.ts` (if exists)

### 3.2 Update dependent files
- Check all imports of deleted action files
- Update `src/features/studio/hook/use-generate-question.ts` to use new hooks
- Check any components using actions directly

### 3.3 Verify no dangling references
```bash
grep -r "useGenerateQuestion\|useRecordQuestionResult" src/features/studio/
```

## Files
- Delete: `src/features/studio/server/action/question.ts`
- Delete: `src/features/studio/server/action/chat.ts`

## Validation
- No compile errors
- All studio functionality works
