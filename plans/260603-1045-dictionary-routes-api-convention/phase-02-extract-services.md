# Phase 02: Extract/Create Services

## Status: Pending

## Overview

Create service files that own the business logic, calling repositories
and returning DTOs. No HTTP/Next.js dependencies.

## Files to Create

### 1. `src/lib/dictionary/dictionary-lookup-service.ts`

Move from `resolve-dictionary-lookup.ts`:
- `resolveDictionaryLookup(term, options)` - normalize, try headword, try alias, return miss
- `resolveQuickDictionaryLookupSql(term, options)` - single-query raw SQL lookup
- `buildEntryDto(entry, targetLanguage, statuses)` - map DB entry to DictionaryEntryDto
- `toTranslationDto(t)` - map translation row to DictionaryTranslationDto

Service imports from `dictionary-lookup-repository.ts` for DB queries.

### 2. `src/lib/dictionary/dictionary-entry-detail-service.ts`

New service:
- `getDictionaryEntryDetail(entryId, options)` - call repository, build DTO via buildEntryDto

Imports `findEntryById` from `dictionary-entry-detail-repository.ts`.
Imports `buildEntryDto` from `dictionary-lookup-service.ts`.

### 3. `src/lib/dictionary/dictionary-suggest-service.ts`

Extract from `suggest/route.ts`:
- `suggestDictionaryTerms(query, options)` - normalize, query repos, merge, rank, dedupe
- `extractPrimaryTranslation(entry)` - pure helper
- `buildHeadwordSuggestItem(entry, normalizedQuery)` - DTO builder
- `buildAliasSuggestItem(entry, normalizedQuery)` - DTO builder
- `rankScore(item)` - sorting helper

Imports from `dictionary-suggest-repository.ts`.

## Acceptance Criteria

- No `NextRequest`/`NextResponse` imports in any service
- No HTTP status codes in services
- Services return domain/DTO types, not HTTP responses
- All business logic (ranking, dedup, normalization) lives in services
