---
phase: 3
title: "Test coverage"
status: pending
priority: P1
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Test coverage

## Overview

Add the tests issue #69 requires and the gaps the note flagged: route status changes, query-layer
side effects, generation success/error/passage-switch race, keyboard flow, and persistence-failure
graceful degradation. Tests verify the FINAL Phase 1 + Phase 2 code.

## Requirements

- Functional: cover happy paths, validation errors, auth (401), ownership (404), already-completed,
  generation race, keyboard, and persistence-failure UX.
- Non-functional: no fake data / no mock-only "passes"; tests must exercise real route + component
  behavior. All tests green before done.

## Architecture

- Route + query tests: extend existing `tests/vitest/integration/api/quiz-attempt-route.test.ts`
  (already mocks `getAuthenticatedUser`, `createQuizAttempt`, `completeQuizAttempt`, and defines an
  `AuthenticationRequiredError`). Use the established fixtures/helpers. Update the tests to use `artifactId` instead of `passageId`.
- UI tests: component tests for `quiz-content` / `quiz-results` and a hook test for
  `use-study-actions` (co-locate next to existing `*.test.ts` in `src/features/study/...`).
- These are the repo's FIRST `.test.tsx` component tests. <!-- Updated: Validation Session 1 -->
  Decision: render with `NextIntlClientProvider` + real `localization/messages/en.json` (not a
  mock). Add a small reusable helper (e.g. `tests/vitest/helpers/render-with-intl.tsx`) that wraps
  RTL `render` in the provider with the `Study` namespace, so later component tests reuse it.

## Related Code Files

- Modify: `tests/vitest/integration/api/quiz-attempt-route.test.ts`
  - Update ownership-miss expectations from `400` to `404` (Phase 1).
  - Add: unauthenticated `POST` -> 401, unauthenticated `PATCH` -> 401, count-mismatch `PATCH` -> 400,
    not-owned `artifactId` on `POST` -> 404, unknown-key rejection (strict) -> 400.
- Create/extend: query tests for `createQuizAttempt` / `completeQuizAttempt`
  - `createQuizAttempt` requires owned session, requires owned artifact when provided, stores
    `artifactId:null` when omitted.
  - `completeQuizAttempt` updates `QuizAttempt` AND linked `StudySession`, computes accuracy,
    rejects already-completed, rejects not-owned.
- Create: `src/features/study/ui/studio/quiz/quiz-content.test.tsx`
  - First checked answer triggers `createQuizAttemptForArtifact(artifactId)`.
  - Keyboard: keys 1-4 select, Enter checks then advances, Backspace goes back.
  - Source quote renders after answering.
  - Attempt-create failure still allows feedback + reaching results; failure message shown.
- Create: `src/features/study/ui/studio/quiz/quiz-results.test.tsx`
  - Calls `completeQuizAttempt` once when `attemptId` present.
  - Completion failure keeps score visible + shows recoverable message.
- Create/extend: `src/features/study/hooks/use-study-actions.test.ts`
  - Generation success -> result `completed` + questions cached.
  - Generation error -> result `error`, global error set.
  - Passage-switch mid-generation -> result kept on originating passage (Phase 2 fix), not discarded.

## Implementation Steps

0. Add `tests/vitest/helpers/render-with-intl.tsx` wrapping RTL `render` in `NextIntlClientProvider`
   with `en.json` messages (reusable for all component tests).
1. Update route test ownership expectations to 404; add the new route cases listed above and change `passageId` to `artifactId`.
2. Add query-layer tests for DB side effects (mock `db` / Prisma client per existing patterns).
3. Write `quiz-content.test.tsx` (mock `quiz-attempt-client`); cover answer, keyboard, source quote,
   failure-still-usable. Use `artifactId`.
4. Write `quiz-results.test.tsx`; cover complete-once and failure-visible-score.
5. Extend `use-study-actions.test.ts` with the three generation scenarios incl. the race.
6. Run targeted file, then full suite + typecheck + lint; fix until green.

## Success Criteria

- [ ] Route tests cover success, 400, 401, 404, already-completed, strict-key rejection with `artifactId`.
- [ ] Query tests prove `StudySession` is updated alongside `QuizAttempt`.
- [ ] Component tests prove keyboard flow, source quote, and persistence-failure graceful degradation.
- [ ] Hook test proves generation success/error and passage-switch race behavior.
- [ ] `pnpm run test`, `pnpm run typecheck`, `pnpm run lint` all pass.

## Risk Assessment

- Component tests for keyboard/effects can be flaky: use Testing Library user-event and assert on
  visible state, not timers.
- The complete-attempt effect can fire twice under Strict Mode in tests: assert call count against
  the intended single-settle behavior defined in Phase 2, not raw invocation.
