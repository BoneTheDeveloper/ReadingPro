# Phase 05: Clean Up Old Files

## Status: Pending

## Overview

Remove or clean up files that are no longer needed after migration.

## Files to Delete

### `src/lib/dictionary/resolve-dictionary-lookup.ts`

All contents moved to:
- `dictionary-lookup-repository.ts` (DB queries)
- `dictionary-lookup-service.ts` (business logic + DTO building)

### `src/lib/dictionary/resolve-dictionary-lookup.test.ts`

Tests for resolve-dictionary-lookup. Replace with:
- `dictionary-lookup-service.test.ts` (tests for service logic)

### `src/lib/dictionary/resolve-quick-dictionary-translation.test.ts`

Update mock path from `./resolve-dictionary-lookup` to `./dictionary-lookup-service`.

## Files to Clean Up

### `src/lib/db/dictionary-queries.ts`

Remove functions that moved to repositories:
- `findEntryById` -> moved to `dictionary-entry-detail-repository.ts`
- `findEntriesByHeadwordPrefix` -> moved to `dictionary-suggest-repository.ts`
- `findEntriesByAliasPrefix` -> moved to `dictionary-suggest-repository.ts`

Keep remaining functions (`findEntryByHeadword`, `findEntryByAliasTerm`, `findEntriesContaining`)
if still used, or delete if dead code.

### `src/lib/db/dictionary-queries.test.ts`

Update or remove tests for moved functions.

## Acceptance Criteria

- No dangling imports to deleted files
- `resolve-dictionary-lookup.ts` fully removed
- `dictionary-queries.ts` only contains functions still in use
- All tests pass after cleanup
