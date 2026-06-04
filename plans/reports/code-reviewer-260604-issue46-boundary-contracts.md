# Code Review: Issue 46 - API Boundary Contracts

**Branch:** `fix/issue-46-api-boundary-contracts`
**Date:** 2026-06-04
**Reviewer:** code-reviewer

## Scope

**Files reviewed (11 source + 3 test + 4 fixture/helper):**
- `src/app/api/translate/route.ts` -- `.strict()` on Zod schema
- `src/app/api/study-session/route.ts` -- UUID validation, JSON parse guard
- `src/app/api/cards/review/route.ts` -- Zod schema, JSON parse guard
- `src/app/api/upload/text/route.ts` -- Zod schema, JSON parse guard
- `src/app/api/upload/route.ts` -- `instanceof File` check
- `src/app/api/vocabulary/route.ts` -- `sourceId` UUID
- `src/app/api/dictionary/entries/[entryId]/route.ts` -- `entryId` UUID
- `src/features/study/study-page-client.tsx` -- removed `mode: "quick"`
- `src/features/study/study-translate-panel.tsx` -- removed detailed translation fetch
- `src/features/study/study-types.ts` -- removed `DetailedTranslationData`
- `src/lib/ai/translator.ts` -- removed detailed translation code
- `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- `tests/vitest/integration/api/routes.test.ts`
- `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`

**LOC changed:** ~250 (source) + ~540 (tests reviewed for coverage)
**Focus:** Recent changes on this branch vs main

## Overall Assessment

The changes are well-structured and methodical. Every affected route now has proper JSON parse error handling, Zod schema validation, and UUID validation before domain/DB calls. The dead detailed-translation code is cleanly removed with no dangling references. The `.strict()` schema on translate correctly rejects legacy `mode` fields. Tests comprehensively cover the new validation paths.

Two issues found: one high-priority ownership-not-found error misclassified as 500, and one medium-priority inconsistent `sourceId` validation in translate.

---

## Critical Issues

None found.

---

## High Priority

### H1. Ownership-not-found ZodError from study-session queries leaks as 500 + Sentry capture

**Location:** `src/app/api/study-session/route.ts:46-55` (POST), `src/app/api/study-session/route.ts:88-98` (PATCH)

**Problem:** Both `createStudySession` and `updateStudySession` in `src/lib/db/study-session-queries.ts` throw `z.ZodError` for domain-level ownership/ existence failures:
- "Passage not found or not owned by user" (line 70)
- "Session not found or not owned by user" (line 107)
- "Session has not started" (line 117)

The route handler's outer `catch` block treats these as unexpected server errors: logs at error level, captures in Sentry, and returns `500`. This violates acceptance criteria #8 ("Expected client errors are not captured as unexpected Sentry exceptions").

The old code had `if (error instanceof z.ZodError)` checks in the catch block that were removed. The intention was correct (schema-level ZodErrors are now handled before the catch), but the domain-query-layer `ZodError` throws for ownership checks were not accounted for.

**Impact:** Legitimate client-facing errors (valid UUID that doesn't exist or isn't owned) pollute Sentry with noise, and the client gets a generic 500 instead of a meaningful error.

**Fix:** Re-add a `ZodError` catch in the route handler's catch block, or better, change the query layer to throw a domain-specific error type that the route can distinguish from unexpected failures:

```typescript
// Option A: Re-add ZodError catch (minimal change)
catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    );
  }
  requestLog.error({ err: error }, 'Failed to create session');
  Sentry.captureException(error, { ... });
  return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
}
```

---

## Medium Priority

### M1. Translate route `sourceId` uses `z.string().min(1)` while vocabulary and other routes use `z.string().uuid()`

**Location:** `src/app/api/translate/route.ts:22`

**Problem:** The translate route accepts any non-empty string for `sourceId`, while vocabulary route validates it as UUID, study-session validates passageId as UUID, etc. A non-UUID sourceId in translate will pass validation and reach the raw SQL query in `fetchCacheAndSource`. The parameterized query prevents SQL injection, but the non-UUID value still hits the database unnecessarily before returning a 404 (no matching passage row).

**Impact:** Minor inconsistency. Not a security risk (parameterized queries). But it violates the principle stated in the plan: "Validate persisted-record IDs as UUIDs at untrusted request boundaries."

**Recommendation:** Consider changing to `z.string().uuid()` to match other routes and reject non-UUID sourceIds before DB calls. Low urgency since the behavior is safe, just inconsistent.

---

## Low Priority

None.

---

## Edge Cases Found by Scout

1. **`createStudySession` with no `passageId`**: Works correctly -- `passageId` is optional in the Zod schema, and `createStudySession` in queries handles `undefined` passageId by skipping the ownership check.

2. **`instanceof File` check for null formData entry**: The upload route (`src/app/api/upload/route.ts:16-17`) correctly handles `formData.get("file")` returning `null`, a string, or a `File`. The `instanceof File ? rawFile : null` pattern safely handles all three cases.

3. **`.strict()` schema and extra fields**: The `.strict()` on translate schema correctly rejects any request with extra fields like `mode: "detailed"` or `mode: "quick"`. The test at line 292-297 of `translation-vocabulary-routes.test.ts` confirms this.

4. **Race condition in study translate panel**: The old translate panel had an `abortRef` pattern for canceling in-flight detailed translation requests on selection change. Since detailed translation was entirely removed, this race condition is eliminated. The quick translation flow in `study-page-client.tsx` uses a `requestId` counter pattern that correctly handles stale responses.

---

## Acceptance Criteria Assessment

| # | Criterion | Status | Notes |
|---|-----------|--------|-------|
| 1 | Mode-less translation returns simple shape | PASS | `.strict()` rejects mode, auto-detection via `getQuickSelectionScope` |
| 2 | Study callers send no mode, no second translate request | PASS | `mode: "quick"` removed, detailed fetch entirely removed from panel |
| 3 | Legacy mode input rejected with 400 | PASS | `.strict()` + test confirms |
| 4 | All public-table PK/FK as native UUID | PASS | All Prisma IDs use `@db.Uuid` with `gen_random_uuid()` |
| 5 | Valid UUID passageId creates sessions; malformed rejected | PARTIAL | Malformed UUIDs rejected by schema. Valid-but-unowned UUIDs incorrectly return 500 (H1) |
| 6 | Malformed/invalid requests return stable 400 | PASS | JSON parse errors and Zod validation errors return 400 |
| 7 | Invalid input never invokes domain/DB write functions | PASS | All validation occurs before `getAuthenticatedUser()` and DB calls |
| 8 | Expected client errors not captured as unexpected Sentry | FAIL | Ownership ZodErrors in study-session leak to Sentry (H1) |
| 9 | Existing valid/unexpected-failure behavior covered | PASS | 268 tests pass, all regression paths tested |

---

## Positive Observations

1. **Consistent validation pattern**: All affected routes follow the same `try { body = await request.json() } catch { return 400 }` + Zod schema pattern. Good for maintainability.

2. **Validation-before-auth ordering**: Every route validates input before calling `getAuthenticatedUser()`. This prevents unnecessary auth checks on malformed input.

3. **Clean dead code removal**: `DetailedTranslationData` type, `generateDetailedAiTranslation` function, the entire detailed translation UI block in the translate panel, and all related imports are cleanly removed with zero dangling references confirmed by grep.

4. **Test coverage is thorough**: Tests cover malformed JSON, missing fields, out-of-range values, non-UUID IDs, and the new `mode` rejection case. The `expectJsonError` helper makes assertions readable.

5. **Database column `mode` preserved**: The `mode: "quick"` in `upsertTranslationCache` and `createTranslationHistory` (translation-queries.ts lines 95, 111) correctly stays as an internal implementation detail matching the existing DB column. No schema migration needed.

---

## Recommended Actions

1. **[High]** Fix H1: Add `ZodError` catch in study-session POST and PATCH handlers to return 400 instead of 500 for ownership/existence errors. This prevents Sentry noise and gives clients meaningful error messages.

2. **[Medium]** Consider M1: Align translate route `sourceId` validation to `z.string().uuid()` for consistency with other routes. Not blocking, but improves defense-in-depth.

3. **[Info]** The `mode: "quick"` hardcoded in `translation-queries.ts` lines 95 and 111 is an internal DB concern, not an API contract issue. This is correctly left unchanged per the plan scope.

---

## Metrics

- Type Coverage: 100% (tsc --noEmit passes clean)
- Test Coverage: 268/268 tests pass (44 test files)
- Linting Issues: 0 on changed files (ESLint clean)
- Dangling References: 0 (confirmed by grep)

---

## Unresolved Questions

1. Should the domain-query-layer functions (`createStudySession`, `updateStudySession`) be refactored to throw a domain-specific error type instead of `ZodError` for ownership/existence failures? This would be cleaner than catching `ZodError` in route handlers, but it's a larger change that may belong in a follow-up.
