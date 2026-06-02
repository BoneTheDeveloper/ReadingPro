# Phase 1: Add DictionarySearchResultDto + Extend Performance Types

## Context Links

- Spec: `docs/API/dictionary-flow.md` lines 196-218 (search response), lines 498-518 (performance budgets)
- Existing DTOs: `src/lib/dictionary/dictionary-dtos.ts`
- Performance tracker: `src/lib/dictionary/dictionary-performance.ts`

## Overview

- Priority: P1
- Status: Pending
- Add `DictionarySearchResultDto` type to DTOs file
- Extend performance phase union to include `"entry-detail"`

## Requirements

### Functional
- `DictionarySearchResultDto` must match spec shape exactly: `{ id, headword, matchType, matchedText, primaryTranslation, partOfSpeech, sourceLabel }`
- `matchType` union: `"exact" | "alias" | "phrase" | "prefix" | "contains"`
- Performance `phase` type must accept `"entry-detail"` in addition to existing `"suggest" | "search" | "lookup"`

### Non-functional
- No runtime impact on existing suggest/lookup code
- DTO type is used only by search route (P3) and entry-detail route (P4)

## Architecture

Pure type additions. No behavioral changes.

```
dictionary-dtos.ts  -- add DictionarySearchResultDto interface
dictionary-performance.ts -- extend phase union type
```

## Related Code Files

### Modify
- `src/lib/dictionary/dictionary-dtos.ts` (add interface after `DictionarySuggestItemDto`)
- `src/lib/dictionary/dictionary-performance.ts` (change phase type on line 8 and line 25)

### Create
- None

### Delete
- None

## Implementation Steps

1. Open `src/lib/dictionary/dictionary-dtos.ts`
2. After `DictionarySuggestItemDto` (line 48), add:

```ts
export interface DictionarySearchResultDto {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "phrase" | "prefix" | "contains";
  matchedText: string | null;
  primaryTranslation: string | null;
  partOfSpeech: string | null;
  sourceLabel: string | null;
}
```

3. Open `src/lib/dictionary/dictionary-performance.ts`
4. Change line 8: `phase: "suggest" | "search" | "lookup";` to `phase: "suggest" | "search" | "lookup" | "entry-detail";`
5. Change line 25: same union type update for the constructor input type

## Todo List

- [ ] Add `DictionarySearchResultDto` interface to `dictionary-dtos.ts`
- [ ] Extend performance phase type to include `"entry-detail"` in `dictionary-performance.ts`
- [ ] Verify TypeScript compilation passes (`pnpm tsc --noEmit`)

## Success Criteria

- `DictionarySearchResultDto` exported from `dictionary-dtos.ts`
- Performance `phase` accepts `"entry-detail"`
- `pnpm tsc --noEmit` passes

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Type name collision | Verified: no existing `DictionarySearchResultDto` in codebase |

## Next Steps

Unblocks P3 (search rewrite) and P4 (entry detail).
