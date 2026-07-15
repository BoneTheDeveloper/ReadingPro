---
phase: 2
title: Migrate vocabulary feature schemas
status: completed
priority: P1
effort: 2h
---

# Phase 2: Migrate vocabulary feature schemas

## Overview

Migrate `src/features/vocabulary/schemas/vocabulary.ts` to follow conventions.

## Requirements

- Functional:
  - Convert `vocabularyItemSchema`, `vocabularySetSchema`, `vocabularyStatsSchema`, `vocabularyListDataSchema` to interfaces
  - Add `toVocabularyItemDto()`, `toVocabularySetDto()`, `toVocabularyStatsDto()`, `toVocabularyListDto()` mappers
  - Rename `*DataSchema` suffix to `*Dto`
  - Keep `*InputSchema` as Zod schemas (already correct)

- Non-functional:
  - All imports updated
  - No TypeScript errors

## Architecture

```
Before:
  vocabularyItemSchema (Zod) → z.infer<> used for DTO type
  vocabularyListDataSchema (Zod) → "*DataSchema" suffix

After:
  VocabularyItemInputSchema (Zod) → input only
  VocabularyItemDto (interface) → output type
  toVocabularyItemDto() → mapper

  VocabularyListDto (interface) → replaces vocabularyListDataSchema
```

## Related Code Files

- Modify: `src/features/vocabulary/schemas/vocabulary.ts`
- Check: `src/features/vocabulary/server/services/*.ts` (uses DTOs)
- Check: `src/features/vocabulary/actions.ts` (imports schemas)
- Check: Client components using vocabulary types

## Implementation Steps

1. **Convert output schemas to interfaces**
   - `vocabularyItemSchema` → `interface VocabularyItemDto` + `toVocabularyItemDto()`
   - `vocabularySetSchema` → `interface VocabularySetDto` + `toVocabularySetDto()`
   - `vocabularyStatsSchema` → `interface VocabularyStatsDto` + `toVocabularyStatsDto()`
   - `vocabularyListDataSchema` → `interface VocabularyListDto` + `toVocabularyListDto()`
   - `vocabularyOccurrenceSchema` → `interface VocabularyOccurrenceDto`

2. **Add mapper functions**
   - Each mapper converts internal model (with Date objects) to DTO (with ISO strings)

3. **Update type exports**
   - Remove `z.infer<>` type exports
   - Use the new interface types

4. **Update imports everywhere**
   - Find all files importing vocabulary types
   - Update to use new `*Dto` types and `to*Dto()` functions

## Success Criteria

- [ ] All `*DataSchema` patterns removed from output types
- [ ] All output types use `interface *Dto` + `to*Dto()` pattern
- [ ] `z.infer<>` not used for DTO types
- [ ] All imports updated, `pnpm run typecheck` passes

## Risk Assessment

- Medium risk: many files may import vocabulary types
- Mitigation: grep to find all usages first, update imports systematically
