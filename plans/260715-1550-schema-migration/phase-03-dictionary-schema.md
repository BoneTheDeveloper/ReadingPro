---
phase: 3
title: Migrate dictionary feature schemas
status: completed
priority: P1
effort: 1h
---

# Phase 3: Migrate dictionary feature schemas

## Overview

Migrate `src/features/dictionary/schemas/dictionary.ts` to follow conventions.

## Requirements

- Functional:
  - Convert all Zod output schemas to TypeScript interfaces
  - Keep existing `buildEntryDto()` and `toTranslationDto()` mappers (already correct pattern)
  - Change `z.infer<>` type exports to use interface types

- Non-functional:
  - All imports updated
  - No TypeScript errors

## Architecture

```
Before:
  dictionaryEntrySchema (Zod) → z.infer<> used for DTO type
  DictionaryEntryDto = z.infer<typeof dictionaryEntrySchema>

After:
  DictionaryEntrySchema (Zod) → input/validation only
  DictionaryEntryDto (interface) → output type
  (Keep existing buildEntryDto() and toTranslationDto() mappers)
```

## Related Code Files

- Modify: `src/features/dictionary/schemas/dictionary.ts`
- Check: `src/features/dictionary/server/services/lookup-quick.ts`
- Check: `src/features/dictionary/actions.ts`
- Check: Client components using dictionary types

## Implementation Steps

1. **Convert Zod schemas to interfaces for output types**
   - `dictionaryTranslationSchema` → `DictionaryTranslationDto` interface
   - `dictionarySenseSchema` → `DictionarySenseDto` interface
   - `dictionaryEntrySchema` → `DictionaryEntryDto` interface
   - `dictionaryMissSchema` → `DictionaryMissDto` interface
   - `dictionarySuggestItemSchema` → `DictionarySuggestItemDto` interface
   - `dictionarySearchResultSchema` → `DictionarySearchResultDto` interface

2. **Rename schemas used for input**
   - Add `Input` suffix where appropriate: `DictionarySuggestInputSchema`, `EntryDetailInputSchema`

3. **Keep mappers as-is**
   - `buildEntryDto()` and `toTranslationDto()` already follow the pattern — no changes needed

4. **Update type exports**
   - Remove `z.infer<>` type exports
   - Use the new interface types directly

5. **Update imports**
   - Find all usages of `z.infer<>` from dictionary schemas
   - Update to use interface types

## Success Criteria

- [ ] All output types use `interface *Dto`
- [ ] `z.infer<>` not used for DTO types
- [ ] Mappers (`buildEntryDto`, `toTranslationDto`) work with new interfaces
- [ ] All imports updated, `pnpm run typecheck` passes

## Risk Assessment

- Low risk: mappers already exist and follow the pattern
- Mitigation: only need to rename types, mappers should work unchanged
