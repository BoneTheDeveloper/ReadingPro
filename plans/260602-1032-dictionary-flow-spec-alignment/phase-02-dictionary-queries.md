# Phase 2: Add findEntryById Query

## Context Links

- Spec: `docs/API/dictionary-flow.md` lines 312-373 (entry detail endpoint)
- Existing queries: `src/lib/db/dictionary-queries.ts`
- Prisma schema: `prisma/schema.prisma` lines 82-97 (DictionaryEntry model)
- Translation status filter: `src/lib/dictionary/dictionary-dtos.ts` line 72 (`RUNTIME_STATUSES`)

## Overview

- Priority: P1
- Status: Pending
- Add `findEntryById` query function to fetch a full dictionary entry by its database id, with senses and runtime-filtered translations

## Requirements

### Functional
- Accept `entryId: string`, `sourceLanguage: string`, `targetLanguage: string`
- Return entry with senses ordered by `usageRank asc`, translations filtered by `targetLanguage` and `status in RUNTIME_STATUSES`
- Return `null` if entry not found or `sourceLanguage` does not match

### Non-functional
- Must produce <=4 Prisma queries for the performance budget (single `findUnique` with nested includes = 1 query)
- Reuse existing `RUNTIME_STATUSES` constant from `dictionary-dtos.ts`

## Architecture

Single Prisma `findUnique` call with deeply nested includes. Mirrors the shape of `findEntryByHeadword` (verified at `dictionary-queries.ts:5-29`) but keyed by `id` instead of compound unique.

```
dictionary-queries.ts -- add findEntryById function
```

## Related Code Files

### Modify
- `src/lib/db/dictionary-queries.ts` (add function after existing exports)

### Create
- None

### Delete
- None

## Implementation Steps

1. Open `src/lib/db/dictionary-queries.ts`
2. Add import for `RUNTIME_STATUSES` (already imported at line 3)
3. Add `findEntryById` function after `findEntriesByAliasPrefix` (after line 154):

```ts
export async function findEntryById(
  entryId: string,
  sourceLanguage: string,
  targetLanguage: string = "vi",
) {
  return db.dictionaryEntry.findUnique({
    where: { id: entryId },
    include: {
      senses: {
        orderBy: { usageRank: "asc" },
        include: {
          translations: {
            where: {
              targetLanguage,
              status: { in: [...RUNTIME_STATUSES] },
            },
            orderBy: [{ rank: "asc" }],
          },
        },
      },
    },
  });
}
```

4. Add `sourceLanguage` guard: the `findUnique` returns the entry regardless of `sourceLanguage`, so add a post-filter check. Alternatively, add a `where` clause combining `id` and `sourceLanguage`. Since Prisma `findUnique` only accepts unique-key `where`, use post-filter:

```ts
export async function findEntryById(
  entryId: string,
  sourceLanguage: string,
  targetLanguage: string = "vi",
) {
  const entry = await db.dictionaryEntry.findUnique({
    where: { id: entryId },
    include: {
      senses: {
        orderBy: { usageRank: "asc" },
        include: {
          translations: {
            where: {
              targetLanguage,
              status: { in: [...RUNTIME_STATUSES] },
            },
            orderBy: [{ rank: "asc" }],
          },
        },
      },
    },
  });

  if (!entry || entry.sourceLanguage !== sourceLanguage) return null;
  return entry;
}
```

## Todo List

- [ ] Add `findEntryById` function to `dictionary-queries.ts`
- [ ] Verify `sourceLanguage` mismatch returns `null`
- [ ] Verify TypeScript compilation passes

## Success Criteria

- `findEntryById` exported from `dictionary-queries.ts`
- Returns `null` for non-existent id or wrong `sourceLanguage`
- Single Prisma query (verified via performance header)

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| sourceLanguage not enforced by findUnique | Post-filter check handles this |

## Next Steps

Unblocks P4 (entry detail endpoint).
