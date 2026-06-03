# Phase 01: Extract Repositories

## Status: Pending

## Overview

Extract DB access functions from `resolve-dictionary-lookup.ts` and `dictionary-queries.ts`
into dedicated `*-repository.ts` files per convention.

## Files to Create

### 1. `src/lib/dictionary/dictionary-lookup-repository.ts`

Extract from `resolve-dictionary-lookup.ts`:
- `findEntryByHeadword(normalizedHeadword, sourceLanguage)` - Prisma findUnique with includes
- `findEntryByAlias(normalizedAlias, sourceLanguage)` - Prisma findFirst alias -> entry with includes

Add Sentry DB spans to each function.

### 2. `src/lib/dictionary/dictionary-entry-detail-repository.ts`

Extract from `dictionary-queries.ts`:
- `findEntryById(entryId, sourceLanguage, targetLanguage)` - Prisma findUnique with includes

Add Sentry DB span.

### 3. `src/lib/dictionary/dictionary-suggest-repository.ts`

Extract from `dictionary-queries.ts`:
- `findEntriesByHeadwordPrefix(prefix, sourceLanguage, limit)` - Prisma findMany
- `findEntriesByAliasPrefix(prefix, sourceLanguage, limit)` - Prisma findMany via aliases

Add Sentry DB spans.

## Acceptance Criteria

- Each repository file only contains DB access + DB spans
- No HTTP concerns, no DTO formatting, no business logic
- All functions typed with explicit return types
