# Phase 03: Rewrite Routes as Thin HTTP Boundaries

## Status: Pending

## Overview

Rewrite all 3 non-compliant route.ts files to be thin HTTP boundaries
that only handle parsing, validation, auth, logging, and response shaping.

## Route Changes

### 1. `src/app/api/dictionary/lookup/route.ts`

- Parse + validate query params (keep Zod schema local)
- Auth user
- Call `resolveDictionaryLookup` from `dictionary-lookup-service`
- Return response
- Keep performance wrapper pattern

### 2. `src/app/api/dictionary/entries/[entryId]/route.ts`

- Parse + validate entryId + query params
- Auth user
- Call `getDictionaryEntryDetail` from `dictionary-entry-detail-service`
- Return response (404 if null)
- Keep performance wrapper pattern

### 3. `src/app/api/dictionary/suggest/route.ts`

- Parse + validate query params
- Auth user
- Call `suggestDictionaryTerms` from `dictionary-suggest-service`
- Return response
- Keep performance wrapper pattern
- Remove all DTO building, ranking, deduplication logic (now in service)

### 4. `src/app/api/dictionary/search/route.ts`

- **No changes** - already follows convention.

## Shared: Move `measureDictionaryStep` to performance helper

Extract the duplicated `measureDictionaryStep` function (currently in all 4 routes)
to `src/lib/dictionary/dictionary-performance.ts`.

## Acceptance Criteria

- Routes only import from services, not repositories or queries
- No business logic in routes (no ranking, DTO building, dedup)
- No raw SQL or Prisma imports in routes
- Each route follows: parse -> validate -> auth -> call service -> respond
