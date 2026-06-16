---
title: "Issue #69 Study Quiz Flow"
description: ""
status: pending
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: []
blockedBy: [project:260616-1107-studio-artifact-model]
blocks: []
created: "2026-06-15T04:02:55.129Z"
createdBy: "ck:plan"
source: skill
---

# Issue #69 Study Quiz Flow

## Overview

Complete GitHub issue #69 (Core Study Loop, P1): make quiz generation and quiz-taking a
reliable learner action in the Study workspace. Much of #69 already exists in code
(generation running/completed/failed states, duplicate-generation lock, keyboard answer flow,
per-passage result caching). This plan closes the **real remaining gaps**, in priority order:
(0, **priority**) make generation failures self-explaining and stop the "progress hell loop" —
persist a structured failure reason across DB/BE/FE and add a generation timeout + Retry so a
hung generation can never lock the action; (1) harden the `quiz-attempt` persistence API and
migrate it to use `artifactId` instead of `passageId` to align with the new `StudioArtifact`
model; (2) surface attempt-persistence failures and render the source quote in the quiz UI, fix
the passage-switch race so a valid generation is not discarded; and (3) add the missing test
coverage.

Two live reliability bugs drive Phase 0:
- **Opaque generation failure** — a failed card shows only a generic "failed" label; the
  backend's real reason is thrown, returned once, then lost (`StudioArtifact` keeps only
  `status`). User and developer both lose the "why". Fix: a single shared `errorCode` (+
  optional `errorDetail`) persisted on the row and rendered as a localized message.
- **Progress hell loop** — the client generation fetch has no timeout, so a hung request leaves
  the artifact stuck `generating`, and the action lock then blocks the 2nd generation forever.
  Fix: client + backend timeout that always settles the artifact to `failed` (`TIMEOUT`),
  releasing the lock, plus a Retry button on the failed card.

Scope decisions (confirmed with user):
- Full issue #69 scope (not just the route slice the existing note covers).
- Ownership/not-owned misses on the quiz-attempt route return **404**, matching `study-session`.
- `QuizAttempt` schema must be migrated from `passageId` to `artifactId` to correctly track which artifact the attempt corresponds to.

Reference note: `implement-notes/260612-2038-implement-quiz-attempt-route.md` — updated to reflect the `artifactId` migration.

## Already implemented (verify, do not rebuild)

- Generation running / completed / failed states — `studio-panel.tsx:459-507`.
- Duplicate-generation prevention (`isCardLocked`) + `maxConcurrent` cap — `studio-panel.tsx:355-364`.
- Keyboard answer flow (1-4 select, Enter check/next, Backspace prev) — `quiz-content.tsx:83-98`.
- Per-passage result cache survives passage switch — `use-study-actions.ts` + `resultsByPassageId`.

## Manual implementation

Doing it by hand? Follow **[manual-implementation-guide.md](./manual-implementation-guide.md)** —
file-by-file focus blocks (FOCUS 1-5) with line anchors, ordered easiest → integrated, plus the
annotated end-to-end flow map.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 0 (priority) | [Generation failure contract + timeout](./phase-00-generation-failure-and-timeout.md) | Pending |
| 1 | [API hardening](./phase-01-api-hardening.md) | Superseded — route/model removed |
| 2 | [Quiz UX completion](./phase-02-quiz-ux-completion.md) | Mostly shipped — only passage-switch race remains |
| 3 | [Test coverage](./phase-03-test-coverage.md) | Pending — retargeted to current surfaces |

> **Reconciled 2026-06-16 (gkg-verified against current code).** The codebase moved off the
> `QuizAttempt`/`/api/quiz-attempt` model the plan was written against. Quiz outcomes now persist
> as a `QuizResult` (1:1 with the quiz `StudioArtifact`) via **server actions**
> (`studioRecordQuizResultAction` / `studioResetQuizResultAction`), and `StudySession` is a
> heartbeat-only record. See `implement-notes/260616-1946-quiz-result-persistence-and-generation-reliability.md`.
> - **Phase 1** (quiz-attempt route 401/404/`.strict()` + `passageId→artifactId` migration) is
>   **superseded** — that route/table no longer exists; the server-action persistence path already
>   enforces auth + ownership-via-parent-artifact + count validation.
> - **Phase 2** items are **already in code**: source quote (`quiz-content.tsx:207-214`),
>   save-failure banner + Retry (`quiz-results.tsx:85-96`), `artifactId` prop, Strict-Mode
>   double-invoke guard (`isSavingRef`). Only the **passage-switch race**
>   (`use-study-actions.ts:99-102`, still marks a valid generation `failed`) remains.
> - **Phase 3** is retargeted: server-action persistence tests, component tests
>   (`NextIntlClientProvider` + real `en.json`), generation failure/timeout tests, and the
>   passage-switch race — not the deleted route tests.

Key dependencies: **Phase 0 ships first** — it fixes the two live generation reliability bugs and
is independent of the rest (it touches the generation path). The Phase 2 remainder (race fix) is
independent and small. Phase 3 verifies the final Phase 0 + Phase 2 code.

## Verification commands

```bash
pnpm run typecheck
pnpm run lint
pnpm exec vitest tests/vitest/integration/api/quiz-attempt-route.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## Dependencies

No cross-plan dependencies. `plans/260611-feature-folder-restructure` is unrelated (already
reflects the current `src/features/study/ui/...` layout this plan targets).

## Validation Log

### Verification Results (Standard tier, 3 phases)
- Claims checked: 11 | Verified: 10 | Failed: 0 | Unverified: 1
- Verified:
  - `route-errors` helpers exist + signatures (`isAuthenticationRequiredError`, `isOwnershipMissError`, `getZodErrorMessage`) — `src/lib/api/route-errors.ts:4,11,15`.
  - `study-session/route.ts` already uses the 401/404/400 ordering this plan mirrors.
  - Query-layer ZodError messages match `isOwnershipMissError` (resource label + "not found/not owned") — `quiz-attempt-queries.ts:13,27,55`.
  - `QuestionData.sourceText` + `sourceLine` exist; `quiz-content.tsx` renders only `explanation` — `types.ts:52-53`, `quiz-content.tsx:194-201`.
  - Persistence failures swallowed — `quiz-content.tsx:55`, `quiz-results.tsx:36`.
  - Passage-switch guard marks valid generation `error` — `use-study-actions.ts:93-95`.
  - Generation states / `isCardLocked` / keyboard flow already implemented (verify-only).
  - i18n = 2 locales (`localization/messages/en.json`, `vi.json`), `Study` namespace confirmed.
  - Component test infra present: `@testing-library/react`, `user-event`, `jsdom` env.
- Unverified / risk: **no existing `.test.tsx` component tests in repo** — Phase 3 sets the first
  precedent; `useTranslations` needs a provider/mock. Raised as interview Q1.

### Interview Decisions (Session 1)
- Q1 Component tests → **NextIntlClientProvider + real `en.json` messages**; add a small reusable
  test render helper. Sets the repo's first component-test pattern. → Phase 3.
- Q2 Persistence-failure UX → **Inline banner + Retry** (non-blocking; quiz usable; score visible). → Phase 2.
- Q3 Passage-switch race → **Keep the generated result on its originating passage** (complete into
  its cache, do not discard). → Phase 2.

### Whole-Plan Consistency Sweep
- Re-read `plan.md` + all 3 phase files after propagation. No stale terms, renamed APIs, or
  superseded decisions. The three decisions match what Phases 2/3 already described (banner+retry,
  keep-on-passage, RTL infra) — propagation added specifics, no contradictions.
- Verification failures: 0. Plan eligible for implementation.
