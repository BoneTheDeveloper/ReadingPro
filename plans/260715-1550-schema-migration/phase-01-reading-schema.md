---
phase: 1
title: Migrate reading feature schemas
status: completed
priority: P1
effort: 1h
---

# Phase 1: Migrate reading feature schemas

## Overview

Migrate `src/features/reading/schemas/translation.ts` to follow conventions.

## Requirements

- Functional:
  - Remove `translateResponseSchema` (response envelope — not needed for internal API)
  - Convert `translationDataSchema` to `TranslationDto` interface + `toTranslationDto()`
  - Keep `*InputSchema` as Zod schemas
  - Keep `TranslationSelection` interface as-is (already correct)

- Non-functional:
  - All imports updated throughout codebase
  - No TypeScript errors

## Architecture

```
Before:
  translationDataSchema (Zod) → used as both input validation and output type

After:
  TranslationInputSchema (Zod) → input validation only
  TranslationDto (interface) → output type
  toTranslationDto() → mapper from internal model to DTO
```

## Related Code Files

- Modify: `src/features/reading/schemas/translation.ts`
- Check: `src/app/api/translate/route.ts` (imports translation schemas)
- Check: `src/features/reading/server/services/inline-translate.ts` (uses translation types)

## Implementation Steps

1. **Remove response envelope**
   - Delete `makeApiResponseSchema()` function
   - Delete `apiErrorResponseSchema`
   - Delete `translateResponseSchema`

2. **Rename `translationDataSchema` → DTO**
   - Rename to `TranslationDto` interface (TypeScript, not Zod)
   - Add `toTranslationDto()` mapper function
   - Delete the old `translationDataSchema` Zod schema

3. **Rename `QuickTranslationData` type**
   - Change to use `TranslationDto` instead

4. **Update imports everywhere**
   - Find all files importing `translationDataSchema` or `translateResponseSchema`
   - Update to use new `TranslationDto` and `toTranslationDto()`

## Success Criteria

- [ ] `translateResponseSchema` removed
- [ ] `translationDataSchema` converted to `interface TranslationDto`
- [ ] `toTranslationDto()` mapper exists
- [ ] All imports updated, no TypeScript errors
- [ ] `pnpm run typecheck` passes

## Risk Assessment

- Low risk: straightforward rename + mapper pattern
- Mitigation: update imports incrementally, run typecheck after each change
