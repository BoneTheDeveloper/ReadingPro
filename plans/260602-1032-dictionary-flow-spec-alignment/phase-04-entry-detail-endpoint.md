# Phase 4: Create Entry Detail Endpoint

## Context Links

- Spec: `docs/API/dictionary-flow.md` lines 312-373 (entry detail endpoint), lines 456-463 (entry detail server logic)
- New query from P2: `src/lib/db/dictionary-queries.ts` -> `findEntryById`
- Lookup route (reference pattern): `src/app/api/dictionary/lookup/route.ts`
- DTO builder in resolve-lookup: `src/lib/dictionary/resolve-dictionary-lookup.ts:172-202` (`buildEntryDto`)
- Auth utils: `src/lib/auth/auth-utils.ts`

## Overview

- Priority: P1
- Status: Pending
- Create `GET /api/dictionary/entries/:entryId` route that returns full `DictionaryEntryDto` by entry id

## Key Insights

1. `buildEntryDto` in `resolve-dictionary-lookup.ts:172-202` already builds `DictionaryEntryDto` from a Prisma entry with senses/translations -- but it's a private function. Need to either extract it or duplicate the logic.
2. Best approach: extract `buildEntryDto` and `toTranslationDto` as exported functions from `resolve-dictionary-lookup.ts` (or move to `dictionary-dtos.ts`). This avoids DRY violation.
3. Lookup route pattern (`lookup/route.ts`) is the closest template -- same auth/validation/performance/error structure but keyed by text query. Entry detail is keyed by path param `entryId`.
4. Spec line 368: "Do not normalize entryId; it is a database id, not learner text."

## Requirements

### Functional
Per spec lines 456-463:
1. Authenticate user
2. Validate path param (`entryId`: non-empty string) and query params (`sourceLanguage: "en"`, `targetLanguage: "vi"`)
3. Resolve `DictionaryEntry` by `entryId` via `findEntryById` (from P2)
4. Filter runtime translations by reviewed/approved status and requested target language (done in query)
5. Return `DictionaryEntryDto` or `404`

### Error responses (spec lines 356-363)
| Status | Condition |
|--------|-----------|
| 400 | Invalid entry id or query params |
| 401 | Missing auth |
| 404 | Entry not found or not available for runtime display |
| 500 | Unexpected failure |

### Non-functional
- <=4 Prisma queries (spec line 518)
- Performance phase: `"entry-detail"`
- entryId is NOT normalized -- used as-is for database lookup

## Architecture

Single new route file. Reuses `buildEntryDto` extracted from resolve-lookup module.

```
src/app/api/dictionary/entries/[entryId]/route.ts  -- NEW: HTTP handler
src/lib/dictionary/resolve-dictionary-lookup.ts     -- MODIFY: export buildEntryDto + toTranslationDto
```

### Data Flow

```
entries/[entryId]/route.ts
  -> validate entryId (path) + sourceLanguage/targetLanguage (query)
  -> authenticate user
  -> findEntryById(entryId, sourceLanguage, targetLanguage)  -- 1 query
  -> if null: return 404
  -> buildEntryDto(entry, targetLanguage, RUNTIME_STATUSES)  -- pure function
  -> return { success: true, data: DictionaryEntryDto }
```

Single Prisma query. Well within <=4 budget.

## Related Code Files

### Modify
- `src/lib/dictionary/resolve-dictionary-lookup.ts` -- export `buildEntryDto` and `toTranslationDto`

### Create
- `src/app/api/dictionary/entries/[entryId]/route.ts` -- new route handler

### Delete
- None

## Implementation Steps

1. Export `buildEntryDto` and `toTranslationDto` from `resolve-dictionary-lookup.ts`:
   - Line 172: change `function buildEntryDto` to `export function buildEntryDto`
   - Line 204: change `function toTranslationDto` to `export function toTranslationDto`

2. Create directory: `src/app/api/dictionary/entries/[entryId]/`

3. Create `src/app/api/dictionary/entries/[entryId]/route.ts`:
   - Follow lookup route pattern for auth/validation/performance/error handling
   - Zod schema for query params: `{ sourceLanguage: z.literal("en"), targetLanguage: z.literal("vi") }`
   - Path param validation: `entryId` must be non-empty string (from `params.entryId`)
   - Import `findEntryById` from `dictionary-queries`
   - Import `buildEntryDto` from `resolve-dictionary-lookup`
   - Import `RUNTIME_STATUSES` from `dictionary-dtos`
   - Performance phase: `"entry-detail"` (added in P1)
   - On null result: return `{ error: "Entry not found." }` with status 404
   - Success response: `{ success: true, data: DictionaryEntryDto }`

4. Key difference from lookup route: no `normalizeDictionaryTerm` call. `entryId` is used directly from path param.

## Implementation Notes

### Next.js App Router dynamic route

Next.js 15+ passes params as a Promise. The route signature should be:

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
```

Then inside: `const { entryId } = await params;`

Verify the Next.js version used in this project supports this pattern.

### Performance tracker adaptation

The performance tracker expects `query` and `normalizedQuery` fields. For entry-detail, the "query" is the entryId. Set both to entryId since there's no normalization step. This keeps the tracker interface consistent.

## Todo List

- [ ] Export `buildEntryDto` and `toTranslationDto` from `resolve-dictionary-lookup.ts`
- [ ] Create `src/app/api/dictionary/entries/[entryId]/route.ts`
- [ ] Verify 404 for non-existent entry id
- [ ] Verify 400 for missing/invalid query params
- [ ] Verify 401 for unauthenticated requests
- [ ] Verify TypeScript compilation passes

## Success Criteria

- `GET /api/dictionary/entries/:entryId?sourceLanguage=en&targetLanguage=vi` returns full `DictionaryEntryDto`
- Non-existent entry id returns 404
- entryId is not normalized
- Only reviewed/approved translations returned
- Performance budget: <=4 queries (actual: 1)
- Route requires authenticated user

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Next.js params type mismatch | Low | Medium | Verify App Router version; test with `pnpm dev` |
| `buildEntryDto` signature mismatch | Low | Low | Function signature verified at `resolve-dictionary-lookup.ts:172-176` -- accepts `entry` with `senses` array |
| 404 vs empty senses ambiguity | Low | Low | `findEntryById` returns null for missing entry; entry with no runtime translations still returns 200 with empty senses array (consistent with lookup behavior) |

## Security Considerations

- entryId is a cuid -- no injection risk
- sourceLanguage validation via zod literal ("en")
- Auth required

## Next Steps

- P5 will add entry-detail-by-id benchmark scenario
- P6 will add integration tests for this endpoint
