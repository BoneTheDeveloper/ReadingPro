# Plan: Rewrite Dictionary Routes to API Convention

## Overview

Refactor all 4 dictionary API routes to follow `docs/API/Api-impliment-conventions.md`.
Target pattern: `route.ts` (HTTP) -> `*-service.ts` (business) -> `*-repository.ts` (DB).

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Extract repositories from queries/resolve files | Pending |
| 02 | Extract/create services | Pending |
| 03 | Rewrite route.ts files as thin HTTP boundaries | Pending |
| 04 | Update external consumers & tests | Pending |
| 05 | Clean up old files | Pending |

## Scope

- **In**: 4 dictionary routes (search, lookup, entries, suggest) + their tests
- **Out**: Non-dictionary routes, translate flow business logic, frontend code

## Key Decisions

1. `dictionary/search` already compliant - no changes needed
2. `resolve-dictionary-lookup.ts` will be split into lookup-service + lookup-repository, then deleted
3. `dictionary-queries.ts` functions will move to dedicated repositories; file cleaned up after
4. `buildEntryDto` / `toTranslationDto` move to `dictionary-lookup-service.ts` (shared by lookup + entry-detail)
5. `measureDictionaryStep` helper (duplicated in all 4 routes) moves to `dictionary-performance.ts`
6. `resolve-quick-dictionary-translation.ts` will update its import to use new lookup-service

## Phase Details

See individual phase files for implementation steps.
