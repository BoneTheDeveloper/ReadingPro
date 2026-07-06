---
phase: 2
title: Remove redundant DTO utility barrel
status: completed
effort: ''
---

# Phase 2: Remove redundant DTO utility barrel

## Overview

Delete `src/features/vocabulary/model/vocabulary-types.ts` and repoint its 8 importers to use the
`XxxDto` names directly from the vocabulary schema file. This barrel exists only to re-export schema
types under de-suffixed aliases (`VocabularyItemDto as VocabularyItem`, etc.) — redundant once `Dto`
is the kept convention. Depends on Phase 1 (schema file is now `vocabulary-response.schema.ts`).

## The barrel (to delete)

```ts
// vocabulary-types.ts — re-exports with aliases, nothing else
export type {
  VocabularyStatus, VocabularySource, VocabularySetType,
  VocabularyItemDto as VocabularyItem,
  VocabularyOccurrenceDto as VocabularyOccurrence,
  VocabularySetDto as VocabularySet,
  VocabularyListResponse, VocabularySetsResponse,
} from "@/features/vocabulary/model/vocabulary-response-schema";
```

Aliased names in use: `VocabularyItem`, `VocabularyOccurrence`, `VocabularySet` (the others already
match the schema export names).

## Importers (8)

`ui/vocabulary-list.tsx`, `ui/vocabulary-set-list.tsx`, `ui/vocabulary-page-client.tsx`,
`ui/vocabulary-set-row.tsx`, `ui/vocabulary-item-card.tsx`, `hooks/use-vocabulary-list.ts`,
`hooks/use-vocabulary-sets.ts`, `vocabulary-client.ts`.

## Implementation Steps

1. In each importer, change the import source from `.../model/vocabulary-types` to
   `.../model/vocabulary-response.schema`.
2. Replace the aliased identifiers with their `Dto` names at **use sites** (honest removal, not
   re-aliasing inline):
   - `VocabularyItem` → `VocabularyItemDto`
   - `VocabularyOccurrence` → `VocabularyOccurrenceDto`
   - `VocabularySet` → `VocabularySetDto`
   Per file: update both the import list and every usage. Use `grep -n` per file to find usages;
   watch for word-boundary safety (e.g. `VocabularySet` is a prefix of `VocabularySetDto`/
   `VocabularySetsResponse`/`VocabularySetType` — replace with boundary anchoring, not blind sed).
3. `git rm src/features/vocabulary/model/vocabulary-types.ts`.
4. `grep -rn 'vocabulary-types' src` → must be empty.
5. `pnpm run typecheck`.

## Risk / Watch-outs

- **Prefix hazard:** `VocabularySet` is a substring of `VocabularySetDto`, `VocabularySetType`,
  `VocabularySetsResponse`. Do not global-sed `VocabularySet` → `VocabularySetDto`. Edit per
  occurrence or anchor on non-identifier boundaries. Typecheck will catch a wrong collapse
  (`VocabularySetDtoType` won't exist).
- This is the one judgment call in the plan (is the barrel truly "not needed"?). It is reversible:
  if the shorter aliases are wanted back, re-create the file. Confirm with user if unsure.

## Success Criteria

- [ ] `vocabulary-types.ts` deleted; grep clean.
- [ ] All 8 importers use `*Dto` names from `vocabulary-response.schema`.
- [ ] `pnpm run typecheck` passes.
