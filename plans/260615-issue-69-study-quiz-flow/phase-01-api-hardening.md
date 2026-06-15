---
phase: 1
title: "API hardening"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: API hardening

## Overview

Bring the `quiz-attempt` route to parity with the sibling `study-session` route: map auth
failures to 401, ownership/not-owned misses to 404, keep validation errors at 400, and make
request schemas strict. Source of truth for behavior: existing code, not the note.

## Requirements

- Functional:
  - Unauthenticated `POST`/`PATCH` return `401`, not `500`.
  - Missing/not-owned study session, passage, or attempt return `404`.
  - Malformed JSON, invalid UUID, negative/mismatched counts return `400`.
  - Unexpected failures stay `500` + Sentry.
  - Extra body fields rejected (`.strict()`), consistent with other study contracts.
- Non-functional: no behavior change for existing happy-path callers; reuse shared helpers.

## Architecture

`route.ts` currently catches only `z.ZodError -> 400` and lets everything else fall to `500`.
The query layer (`quiz-attempt-queries.ts`) throws `z.ZodError` with messages like
`"Study session not found or not owned by user"` / `"Passage not found..."` /
`"Quiz attempt not found..."`. The shared helper `isOwnershipMissError(error, labels)`
(`src/lib/api/route-errors.ts:15`) already matches those messages by resource label + "not found"
/"not owned", so the 404 mapping needs no query-layer changes — only route-layer catch ordering.

Catch-block order (mirror `study-session/route.ts`):
1. `isAuthenticationRequiredError(error)` -> 401
2. `isOwnershipMissError(error, ['study session','passage','quiz attempt'])` -> 404
3. `error instanceof z.ZodError` -> 400 via `getZodErrorMessage(error)`
4. else -> log + Sentry + 500

Validation `ZodError`s (bad UUID, count mismatch) are produced by `safeParse` and already
returned inline as 400 before the try-body resolves; only query-layer ownership `ZodError`s
reach the catch, so step 2 must precede step 3.

## Related Code Files

- Modify: `src/app/api/quiz-attempt/route.ts`
  - Import `isAuthenticationRequiredError, isOwnershipMissError, getZodErrorMessage` from `@/lib/api/route-errors`.
  - Add the 4-step catch ordering above to both `POST` and `PATCH`.
  - Add `.strict()` to `quizAttemptPostSchema` and `quizAttemptPatchSchema` (apply `.strict()`
    on the base object before `.refine()` for the PATCH schema).
- Read for pattern: `src/app/api/study-session/route.ts`, `src/lib/api/route-errors.ts`.
- No change expected: `src/lib/db/quiz-attempt-queries.ts` (messages already match the helper).

## Implementation Steps

1. Add the three helper imports to `route.ts`.
2. Apply `.strict()` to both request schemas (PATCH: `z.object({...}).strict().refine(...)`).
3. Replace each catch block (POST + PATCH) with the 401 -> 404 -> 400 -> 500 ordering.
4. Run typecheck. Update existing route tests that assert `400` for ownership misses to expect
   `404` (see Phase 3 — keep code and tests in the same logical change set to avoid red CI).
5. Verify no other caller depends on the old `400`-for-ownership behavior (`rg` for quiz-attempt
   route usage; client only reads `success`/`data`/`error`, so status change is safe).

## Success Criteria

- [ ] Unauthenticated `POST` and `PATCH` return `401`.
- [ ] Not-owned/missing session, passage, attempt return `404`.
- [ ] Invalid JSON / UUID / count math still return `400`.
- [ ] Both schemas reject unknown keys.
- [ ] `pnpm run typecheck` and the quiz-attempt route test file pass.

## Risk Assessment

- Changing 400 -> 404 breaks existing assertions: mitigate by updating tests in the same change
  (Phase 3 lists the exact cases).
- `.strict()` could break a caller sending extra fields: verified current callers
  (`quiz-attempt-client.ts`) send only the declared fields. Low risk.
