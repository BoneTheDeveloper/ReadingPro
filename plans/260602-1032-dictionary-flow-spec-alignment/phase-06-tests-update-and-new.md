# Phase 6: Update Search Test + Add Entry-Detail Tests

## Context Links

- Existing search test: `tests/vitest/integration/api/dictionary-search-route.test.ts`
- Test helpers: `tests/vitest/integration/helpers/assertions.ts`, `tests/vitest/integration/helpers/api.ts`
- Test fixtures: `tests/vitest/integration/fixtures/index.ts` (or `fixtures.ts`)
- New search resolver from P3: `src/lib/dictionary/dictionary-search-resolver.ts`
- New entry-detail route from P4: `src/app/api/dictionary/entries/[entryId]/route.ts`
- Suggest route test pattern: no existing file, but suggest route `src/app/api/dictionary/suggest/route.ts` is the reference pattern

## Overview

- Priority: P1
- Status: Pending
- Rewrite search integration test to expect `DictionarySearchResultDto[]` instead of `DictionaryEntryDto`
- Add entry-detail integration test for the new endpoint

## Key Insights

1. Existing search test (`dictionary-search-route.test.ts`) mocks `resolveDictionaryLookup` (line 18). After P3, the search route no longer calls `resolveDictionaryLookup` -- it calls `resolveDictionarySearch` from the new resolver. The mock target must change.
2. Test structure follows a clear pattern: `vi.hoisted()` for mock declarations, `vi.mock()` for module interception, `createSearchRequest()` helper, `beforeEach` for mock setup, `describe/it` blocks.
3. Entry-detail test needs a new file since it tests a different route. It follows the lookup route test pattern but with path-param entryId instead of query-string q.
4. The search test currently asserts `payload.data` matches a `DictionaryEntryDto` (line 75). After P3, `payload.data` will be `DictionarySearchResultDto[]`.

## Requirements

### Functional -- Search Test Rewrite
- Mock `dictionary-search-resolver` module instead of `resolve-dictionary-lookup`
- Mock `resolveDictionarySearch` to return `DictionarySearchResultDto[]`
- Assert response shape: `{ success: true, data: DictionarySearchResultDto[] }`
- Preserve existing test cases: valid query, invalid params, unauthenticated

### Functional -- Entry-Detail Test (New)
- Test 200: valid entryId returns `{ success: true, data: DictionaryEntryDto }`
- Test 400: invalid/missing query params
- Test 401: unauthenticated request
- Test 404: non-existent entryId

## Architecture

Two test files, both using the established vitest integration pattern.

```
tests/vitest/integration/api/dictionary-search-route.test.ts      -- REWRITE
tests/vitest/integration/api/dictionary-entry-detail-route.test.ts -- NEW
```

## Related Code Files

### Modify
- `tests/vitest/integration/api/dictionary-search-route.test.ts`

### Create
- `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`

### Delete
- None

## Implementation Steps

### 1. Rewrite `dictionary-search-route.test.ts`

The current test (103 lines) needs these changes:

**Mock target change** (line 18):
```ts
// Before
vi.mock("@/lib/dictionary/resolve-dictionary-lookup", () => ({
  resolveDictionaryLookup: routeMocks.resolveDictionaryLookup,
}));

// After
vi.mock("@/lib/dictionary/dictionary-search-resolver", () => ({
  resolveDictionarySearch: routeMocks.resolveDictionarySearch,
}));
```

**Mock declaration change** (line 10):
```ts
// Before
resolveDictionaryLookup: vi.fn(),

// After
resolveDictionarySearch: vi.fn(),
```

**Test data change** (lines 26-57):
Replace `dictionaryEntry: DictionaryEntryDto` with:
```ts
const searchResults: DictionarySearchResultDto[] = [
  {
    id: "dict-algorithm",
    headword: "algorithm",
    matchType: "exact",
    matchedText: null,
    primaryTranslation: "thuat toan",
    partOfSpeech: "noun",
    sourceLabel: "Dictionary",
  },
];
```

Import `DictionarySearchResultDto` instead of `DictionaryEntryDto`.

**Assertion changes** (lines 66-79):
```ts
it("returns dictionary search results for the authenticated user", async () => {
  routeMocks.resolveDictionarySearch.mockResolvedValue(searchResults);

  const response = await dictionarySearch(
    createSearchRequest("q=algorithm&sourceLanguage=en&targetLanguage=vi"),
  );
  const payload = await readJsonResponse(response);

  expect(response.status).toBe(200);
  expectApiSuccessPayload(payload);
  expect(payload).toMatchObject({ success: true, data: searchResults });
  expect(routeMocks.resolveDictionarySearch).toHaveBeenCalledWith(
    "algorithm",
    { sourceLanguage: "en", targetLanguage: "vi" },
  );
});
```

**Invalid params and auth tests** remain structurally the same -- they test validation/auth which doesn't change. Update mock references from `resolveDictionaryLookup` to `resolveDictionarySearch`.

### 2. Create `dictionary-entry-detail-route.test.ts`

Follow the established pattern:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as dictionaryEntryDetail } from "@/app/api/dictionary/entries/[entryId]/route";
import type { DictionaryEntryDto } from "@/lib/dictionary/dictionary-dtos";
import { userProfileFixture } from "../../fixtures";
import { readJsonResponse } from "../../helpers/api";
import { expectApiErrorPayload, expectApiSuccessPayload } from "../../helpers/assertions";

const routeMocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  findEntryById: vi.fn(),
}));

vi.mock("@/lib/auth/auth-utils", () => ({
  getAuthenticatedUser: routeMocks.getAuthenticatedUser,
}));

vi.mock("@/lib/db/dictionary-queries", () => ({
  findEntryById: routeMocks.findEntryById,
}));

function createEntryDetailRequest(entryId: string, query: string = "sourceLanguage=en&targetLanguage=vi") {
  return new NextRequest(
    `https://english-reading.test/api/dictionary/entries/${encodeURIComponent(entryId)}?${query}`,
  );
}

// ... fixture data, test cases
```

Note: the route handler signature includes `params` as a Promise. In tests, Next.js wraps the route internally. The test calls `dictionaryEntryDetail(request, { params: Promise.resolve({ entryId: "..." }) })`.

Check how other tests handle dynamic route params in this project -- if no prior art, pass the params object directly.

**Test cases:**

1. **200 -- valid entry**: mock `findEntryById` to return entry with senses/translations, assert `DictionaryEntryDto` response
2. **400 -- missing query params**: request without `sourceLanguage`/`targetLanguage`
3. **400 -- empty entryId**: request with empty string entryId
4. **401 -- unauthenticated**: mock throws "Authentication required"
5. **404 -- entry not found**: mock `findEntryById` returns `null`

## Todo List

- [ ] Rewrite search test mock target from `resolveDictionaryLookup` to `resolveDictionarySearch`
- [ ] Update search test fixture data to `DictionarySearchResultDto[]`
- [ ] Update search test assertions
- [ ] Create entry-detail integration test file
- [ ] Add 200, 400, 401, 404 test cases for entry-detail
- [ ] Run `pnpm test` to verify all tests pass

## Success Criteria

- Search test passes with new response shape
- Search test validates `DictionarySearchResultDto[]` response
- Entry-detail test covers 200, 400, 401, 404 cases
- All existing suggest/lookup tests still pass
- `pnpm test` exits 0

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dynamic route params handling differs in test vs runtime | Medium | Medium | Check Next.js test utils; may need to mock `params` differently |
| `buildEntryDto` export change breaks resolve-lookup test | Low | Medium | Verify `resolve-dictionary-lookup.test.ts` still passes (it mocks at query level, not buildEntryDto level) |
| Search resolver mock signature unclear | Low | Low | Signature defined in P3: `resolveDictionarySearch(query, options)` |

## Security Considerations

- Tests verify auth requirement on all endpoints
- Tests verify invalid input rejection (400)

## Next Steps

After P6, all acceptance criteria are met. Run full test suite + performance benchmark to verify.
