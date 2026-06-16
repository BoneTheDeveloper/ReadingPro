---
phase: 1
title: "API hardening"
status: superseded
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: API hardening

> ⚠️ **SUPERSEDED 2026-06-16 (gkg-verified).** This phase targeted the
> `/api/quiz-attempt` POST/PATCH route and the `QuizAttempt` table — **both removed**.
> Quiz outcomes now persist as a `QuizResult` (1:1 with the quiz `StudioArtifact`) via
> the server actions `studioRecordQuizResultAction` / `studioResetQuizResultAction`
> (`src/features/study/actions/studio-artifact-actions.ts`). Those actions already
> enforce auth (`getAuthenticatedUser`), ownership-via-parent-artifact
> (`recordQuizResult`/`resetQuizResult` in `studio-artifacts-service.ts`), and count
> validation — so this phase's intent (harden quiz persistence) is met by current code.
> No `passageId→artifactId` migration is needed (the `QuizAttempt` table is gone).
> The remaining persistence-hardening concern moved to **Phase 0** (generation failure
> contract + timeout). Content below is kept for history only.

## Overview

Bring the `quiz-attempt` route to parity with the sibling `study-session` route: map auth
failures to 401, ownership/not-owned misses to 404, keep validation errors at 400, and make
request schemas strict. In addition, migrate the `QuizAttempt` schema and API to use `artifactId`
instead of `passageId` to properly align with the new `StudioArtifact` model, ensuring we can track
which specific quiz an attempt belongs to.

## Requirements

- Functional:
  - `QuizAttempt` table drops `passageId` and adds `artifactId` (UUID, nullable, FK to `StudioArtifact`).
  - Unauthenticated `POST`/`PATCH` return `401`, not `500`.
  - Missing/not-owned study session, artifact, or attempt return `404`.
  - Malformed JSON, invalid UUID, negative/mismatched counts return `400`.
  - Unexpected failures stay `500` + Sentry.
  - Extra body fields rejected (`.strict()`), consistent with other study contracts.
  - POST request body uses `artifactId` instead of `passageId`.
- Non-functional: no behavior change for existing happy-path callers; reuse shared helpers.

## Architecture

`route.ts` currently catches only `z.ZodError -> 400` and lets everything else fall to `500`.
The query layer (`quiz-attempt-queries.ts`) throws `z.ZodError` with messages like
`"Study session not found or not owned by user"` / `"Passage not found..."` /
`"Quiz attempt not found..."`. The shared helper `isOwnershipMissError(error, labels)`
(`src/lib/api/route-errors.ts:15`) already matches those messages by resource label + "not found"
/"not owned". The `isOwnershipMissError` must be updated to look for `'artifact'` instead of `'passage'`
where appropriate for quiz attempts.

Catch-block order (mirror `study-session/route.ts`):
1. `isAuthenticationRequiredError(error)` -> 401
2. `isOwnershipMissError(error, ['study session','artifact','quiz attempt'])` -> 404
3. `error instanceof z.ZodError` -> 400 via `getZodErrorMessage(error)`
4. else -> log + Sentry + 500

Validation `ZodError`s (bad UUID, count mismatch) are produced by `safeParse` and already
returned inline as 400 before the try-body resolves; only query-layer ownership `ZodError`s
reach the catch, so step 2 must precede step 3.

## Related Code Files

- Modify: `prisma/schema.prisma`
  - Update `QuizAttempt` model: replace `passageId` with `artifactId` (FK to `StudioArtifact`).
- Modify: `src/lib/db/quiz-attempt-queries.ts`
  - Update `createQuizAttempt` to take `artifactId` and check `StudioArtifact` instead of `Passage`.
- Modify: `src/app/api/quiz-attempt/route.ts`
  - Import `isAuthenticationRequiredError, isOwnershipMissError, getZodErrorMessage` from `@/lib/api/route-errors`.
  - Change `passageId` to `artifactId` in `quizAttemptPostSchema`.
  - Add the 4-step catch ordering above to both `POST` and `PATCH`.
  - Add `.strict()` to `quizAttemptPostSchema` and `quizAttemptPatchSchema` (apply `.strict()`
    on the base object before `.refine()` for the PATCH schema).
- Modify: `src/features/study/api/quiz-attempt-client.ts`
  - Rename `createQuizAttemptForPassage` to `createQuizAttemptForArtifact` and accept `artifactId`.

## Implementation Steps

1. Update `prisma/schema.prisma` to replace `passageId` with `artifactId` in `QuizAttempt`. Run `pnpm run db:migrate:dev` to create the migration.
2. Update `src/lib/db/quiz-attempt-queries.ts` to query `StudioArtifact` instead of `Passage` and save `artifactId`.
3. Update `src/app/api/quiz-attempt/route.ts` request schemas (`artifactId`, `.strict()`) and the catch ordering.
4. Update `src/features/study/api/quiz-attempt-client.ts` to use `artifactId`.
5. Run typecheck. Update existing route tests that assert `400` for ownership misses to expect `404`, and change `passageId` to `artifactId` in tests.

## Success Criteria

- [ ] `QuizAttempt` is successfully migrated to `artifactId`.
- [ ] Unauthenticated `POST` and `PATCH` return `401`.
- [ ] Not-owned/missing session, artifact, attempt return `404`.
- [ ] Invalid JSON / UUID / count math still return `400`.
- [ ] Both schemas reject unknown keys.
- [ ] `pnpm run typecheck` and the quiz-attempt route test file pass.

## Risk Assessment

- Changing 400 -> 404 breaks existing assertions: mitigate by updating tests in the same change
  (Phase 3 lists the exact cases).
- `.strict()` could break a caller sending extra fields: verified current callers
  (`quiz-attempt-client.ts`) send only the declared fields. Low risk.
