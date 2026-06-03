# Phase 04: Update Consumers & Tests

## Status: Pending

## Overview

Update external consumers of moved code and rewrite integration tests.

## External Consumer Updates

### `src/lib/dictionary/resolve-quick-dictionary-translation.ts`

- Update import: `resolveQuickDictionaryLookupSql` from `./resolve-dictionary-lookup`
  -> from `./dictionary-lookup-service`

## Test Updates

### 1. `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`

- Change mock target: `@/lib/db/dictionary-queries` -> `@/lib/dictionary/dictionary-entry-detail-service`
- Mock `getDictionaryEntryDetail` instead of `findEntryById` + `buildEntryDto`
- Keep same test scenarios

### 2. `tests/vitest/integration/api/dictionary-search-route.test.ts`

- **No changes needed** - already mocks the service correctly

### 3. Add `tests/vitest/integration/api/dictionary-lookup-route.test.ts`

- New test file for lookup route (currently untested at integration level)
- Mock `dictionary-lookup-service`
- Cover: success, miss, invalid params, auth failure

### 4. Add `tests/vitest/integration/api/dictionary-suggest-route.test.ts`

- New test file for suggest route (currently untested at integration level)
- Mock `dictionary-suggest-service`
- Cover: success, short query, invalid params, auth failure

## Acceptance Criteria

- All existing test scenarios preserved
- New tests for lookup and suggest routes
- All tests pass
