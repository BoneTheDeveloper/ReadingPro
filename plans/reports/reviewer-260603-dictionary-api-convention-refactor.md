# Code Review: Dictionary API Convention Refactor

**Reviewer:** code-reviewer
**Date:** 2026-06-03
**Branch:** dictionary_search_flow_impliment
**Scope:** Dictionary route -> service -> repository layering refactor

## Scope

- Files: 4 routes, 6 new service/repository files, 1 performance helper update, 4 test files
- LOC: ~879 new lib code, ~586 route code, ~340 test code
- Focus: Convention compliance, layer separation, no regressions
- Scout findings: 3 issues found (see below)

## Overall Assessment

The refactor is well-executed. All 4 dictionary routes now follow the `route -> service -> repository` convention from `docs/API/Api-conventions.md`. Routes are thin HTTP boundaries, services own business logic and DTO building, repositories own DB access with Sentry spans. No stale imports remain, TypeScript compiles clean, and all 232 tests pass. There are a few medium-priority issues worth addressing.

## Critical Issues

None.

## High Priority

None.

## Medium Priority

### M1. Raw SQL in service layer (dictionary-lookup-service.ts:79)

`resolveQuickDictionaryLookupSql` at line 60-125 contains a raw SQL `$queryRaw` call directly in the service. Per convention, raw SQL belongs in the repository layer. The search route correctly puts its raw SQL in `dictionary-search-repository.ts`, making this an inconsistency.

**Impact:** Convention violation. The function is called by `resolve-quick-dictionary-translation.ts` (a separate use-case), so it is more repository-like than service-like.

**Fix:** Move `resolveQuickDictionaryLookupSql` and the `QUICK_LOOKUP_STATUSES` Prisma.join constant into `dictionary-lookup-repository.ts`. The service can re-export it for backward compatibility, or `resolve-quick-dictionary-translation.ts` can import from the repository directly.

### M2. Unsafe type cast in entry-detail-service (line 19)

```ts
return buildEntryDto(
  entry as unknown as LookupEntryRow & {},
  options.targetLanguage,
  RUNTIME_STATUSES,
);
```

The `as unknown as LookupEntryRow & {}` bypasses TypeScript's structural checking. Both `EntryDetailRow` and `LookupEntryRow` are derived from nearly identical Prisma queries (same includes), so the cast is **currently safe at runtime**. However, if the repository queries diverge, this cast will silently pass bad data.

**Impact:** Fragile coupling between two repository query shapes via a type cast. If someone adds an include to one repo but not the other, no type error fires.

**Fix options:**
1. Extract a shared type for the common Prisma return shape (e.g., `DictionaryEntryWithSensesRow`) and use it in both repositories and `buildEntryDto`.
2. Move `buildEntryDto` into a shared utility and have it accept a well-defined interface rather than the full Prisma return type.

### M3. Cross-service import: entry-detail-service imports from lookup-service

`dictionary-entry-detail-service.ts` imports `buildEntryDto` and `LookupEntryRow` from `dictionary-lookup-service.ts`. Per convention, services should import from repositories and shared modules, not from each other. This creates a hidden dependency: the entry-detail route is coupled to the lookup service's internals.

**Impact:** If the lookup service's `buildEntryDto` signature changes, the entry-detail service breaks silently (especially given the cast from M2). Also makes it harder to reason about the entry-detail flow independently.

**Fix:** Move `buildEntryDto` and `toTranslationDto` to a shared utility file (e.g., `dictionary-entry-dto-builder.ts` or into `dictionary-dtos.ts`).

## Low Priority

### L1. Duplicated QUICK_LOOKUP_STATUSES constant

`QUICK_LOOKUP_STATUSES` is defined and exported in both:
- `dictionary-lookup-repository.ts:76` -- `const QUICK_LOOKUP_STATUSES = RUNTIME_STATUSES;` (plain array)
- `dictionary-lookup-service.ts:58` -- `const QUICK_LOOKUP_STATUSES = Prisma.join(RUNTIME_STATUSES);` (Prisma SQL join)

These serve different purposes (one is a JS array, the other is a SQL template value), so they are not true duplicates. But the identical name is confusing. The repository export (line 76-77) appears unused.

**Fix:** Verify `QUICK_LOOKUP_STATUSES` from the repository is unused and remove it. If it is needed, rename for clarity.

### L2. Route handler boilerplate repetition

All 4 routes share ~90% identical boilerplate: `isAuthenticationError`, `shouldIncludeDictionaryPerformanceMetrics`, `runWithPrismaQueryMetrics`, performance tracker setup, success response builder. This is ~500 lines of near-identical code across the 4 route files.

**Impact:** Not a bug, but a maintainability concern. A change to auth error handling or performance wrapping must be replicated in 4 places.

**Recommendation:** Consider a shared `createDictionaryRouteHandler` wrapper in a future cleanup pass. Not blocking for this PR.

### L3. suggest route returns early for short queries before authentication

In `src/app/api/dictionary/suggest/route.ts:69-73`, the route returns `[]` for queries with `normalizedQuery.length < 2` before calling `getAuthenticatedUser()`. This means unauthenticated users can probe whether the suggest endpoint is up without receiving a 401.

**Impact:** Low. The search route delegates short-query handling to the service (which does authenticate first), making the behavior inconsistent between routes. Either the short-query early return should happen after auth, or the search route's approach (let service handle it) should be adopted here too for consistency.

## Edge Cases Found by Scout

1. **QUICK_LOOKUP_STATUSES dead export in repository** -- The repository defines and exports this constant but it is never imported by any file. Dead code.
2. **resolveQuickDictionaryLookupSql is a service-repository hybrid** -- Contains raw SQL but lives in the service. Called from outside the route flow (by `resolve-quick-dictionary-translation.ts`), making it a cross-cutting concern.
3. **Entry-detail service structural type coupling** -- Two repositories produce structurally similar but independently typed Prisma returns, joined by an unsafe cast in the service.

## Positive Observations

1. Clean layer separation: routes contain only HTTP concerns, no business logic, no SQL.
2. No Next.js imports in service or repository layers (verified by grep).
3. No stale imports of deleted files (`dictionary-queries`, `resolve-dictionary-lookup`, `dictionary-search-resolver`).
4. All routes follow consistent error handling: auth errors -> 401, validation -> 400, unexpected -> 500 with Sentry capture.
5. Repository files all wrap DB calls in Sentry spans with meaningful operation names and attributes.
6. Services return domain types, not HTTP responses.
7. Test coverage is thorough: each route has integration tests covering success, validation, auth, and edge cases.
8. The search-repository SQL is well-structured with proper CTEs and LATERAL joins, keeping the ranking logic close to the query.
9. Performance tracking is cleanly separated into `dictionary-performance.ts` and the shared `measureDictionaryStep` helper.

## Recommended Actions

1. **M1:** Move `resolveQuickDictionaryLookupSql` to `dictionary-lookup-repository.ts` -- raw SQL belongs in repositories.
2. **M2+M3:** Extract `buildEntryDto` / `toTranslationDto` into a shared utility file, define a shared interface for the entry row shape. This eliminates the unsafe cast and the cross-service import in one change.
3. **L1:** Remove unused `QUICK_LOOKUP_STATUSES` export from `dictionary-lookup-repository.ts`.
4. **L3:** Decide on consistent short-query handling: either always authenticate first (like search route) or always short-circuit (like suggest route). Document the choice.

## Metrics

- Type Coverage: 100% (tsc --noEmit passes clean)
- Test Coverage: 232/232 tests pass
- Linting Issues: 0 (no compilation errors)
- Convention Compliance: 3/4 routes fully compliant; lookup route has one function misplaced (M1)

## Unresolved Questions

1. Should `resolveQuickDictionaryLookupSql` move to the repository now, or is it acceptable to leave it in the service since it is called from `resolve-quick-dictionary-translation.ts` (which is itself a quasi-service)?
2. Is the short-query-before-auth behavior in the suggest route intentional (to reduce unnecessary auth load for trivial queries) or an oversight?
