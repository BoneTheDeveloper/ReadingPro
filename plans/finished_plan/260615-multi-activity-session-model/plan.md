---
title: "Plan C — App-wide presence sessions → study-time streak & analytics"
description: "Redefine StudySession as an app-wide presence window (open on any authenticated page, close after ~10 min inactivity) and build its read-side: a daily streak that counts a day only when total study time > 10 min, plus engagement analytics (time today / this week / active days). Includes the live study_sessions 500 fix and an advisory-lock one-open-session-per-user invariant."
status: completed
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: [feature, data-model, session, lifecycle, analytics]
blockedBy: [project:260615-studysession-quiz-session-role]
blocks: []
created: "2026-06-15"
revised: "2026-06-15"
createdBy: "brainstorm"
source: skill
---

# Plan C — App-wide presence sessions → study-time streak & analytics (D1)

> Resolves decision **D1**: a session is a **simple presence window**, not a quiz wrapper.
> Builds on **Plan A**'s cleaned-up `StudySession` (WHO/WHEN/lifecycle only) and **Plan B**'s
> `QuestionReview`. Revised 2026-06-15 to (a) make presence **app-wide**, (b) add the
> read-side (streak + analytics), and (c) replace the soft multi-tab approach with a hard
> integrity constraint.

## Decision (resolved)

Session = **app-wide presence window**, decoupled from study-activity type:
- **START:** on entry to any authenticated page, when no open session exists.
- **CLOSE:** after ~10 min of inactivity (lazy sweep).
- **Attach:** study events (quiz attempts now; reviews later) attach to whichever session
  is currently open.
- **Read-side (new):** sessions power a **study-time streak** and **engagement analytics**.

### What a "study day" means (user-confirmed)
A day counts toward the streak **only if total study time that day > 10 minutes**
(`> 600s`), summed across that day's sessions. Streak = consecutive qualifying days ending
today. This **replaces** the old `question_reviews`-based streak (the SRS review UI is
dormant — `cards/due` + `cards/review` have no client caller — so nothing live regresses).

### MVP defaults (user-confirmed)
- **AFK:** visible-tab time counts (no interaction gating). Heartbeat only pings while the
  tab is visible, so background tabs do not inflate time.
- **Timezone:** server/DB timezone for day bucketing (`DATE(...)`). Per-user tz deferred.
- **Analytics surfaced:** time studied today, time studied this week, active days this week.

## Concurrency decision — advisory lock (REVERSAL from prior revision)

Multi-tab/multi-device model: **one open session per user, not per device.** In steady
state reuse-newest already collapses concurrent tabs into one session (wall-clock time, no
double-count). The only race is the cold-start window where two tabs find no open session
and both `create`.

Resolved mechanism (user spec): serialize ensure-calls per user with a **transaction-level
advisory lock** at the top of the transaction, then sweep → reuse → create, all in one
transaction. The partial unique index `UNIQUE (userId) WHERE completedAt IS NULL` is a
**backstop invariant only** (defense in depth) — the lock makes the violation unreachable
under normal load, so there is **no `P2002` catch/retry in the hot path**.

```
SELECT pg_advisory_xact_lock(hashtext('study_session:' || $userId)::bigint);
```

This supersedes the earlier "soft reuse-newest" and the interim "retry-on-P2002" idea.

## Current state (verified 2026-06-15)

Much of the original Phase 1 already shipped, but it is **broken in production**:
- `StudySession` already has `startedAt` / `lastSeenAt` / `completedAt`
  (`prisma/schema.prisma:340-352`).
- `ensureActiveSession`, `closeStaleStudySessions`, `SESSION_IDLE_MS` already implemented
  (`src/lib/db/study-session-queries.ts`).
- Quiz flow already reuses the open session: `createQuizAttemptForPassage`
  (`quiz-attempt-client.ts:11`) calls `ensureStudySession()` then `POST /api/quiz-attempt`.
- **BUG (live 500):** `StudySession` is the only model missing `@@map`, so the table is
  created as `"StudySession"` while the raw SQL in `study-session-queries.ts:29,42`
  targets `"study_sessions"` → `42P01 relation "study_sessions" does not exist`. The init
  migration is fresh/uncommitted (`prisma/migrations/20260615143528_init/`), so it can be
  regenerated cleanly.
- Heartbeat exists but is mounted **only** on `/study`
  (`study-workspace-client.tsx:57`) — not app-wide.
- `/progress` page just `redirect("/")`; the **landing page `[locale]/page.tsx` is the real
  dashboard** and currently renders hardcoded `mockStats` (`streakDays: 9`), not
  `getUserProgress`.

## Target behavior

```
Any authed page entry -> ensureActiveSession(userId):  (single db.$transaction)
                pg_advisory_xact_lock(hashtext('study_session:'||userId))  // serialize per user
                close any open session idle > 10 min (completedAt = lastActivityAt)
                reuse the one open session, else create new
Heartbeat  -> every 60s + on tab-focus (visible only) bump lastActivityAt on the open session
Quiz start -> ensureActiveSession() then create a QuizAttempt on it (N attempts / session)
Close      -> lazy on next ensureActiveSession sweep (no cron)
Read       -> getUserProgress sums per-day session time:
                streakDays      = consecutive days (ending today) with daily time > 600s
                timeStudiedTodaySeconds / timeStudiedWeekSeconds = RAW seconds (ungated)
                activeDaysThisWeek = days in last 7 with daily time > 600s
```
Duration = `lastActivityAt − startedAt` (open) / `completedAt − startedAt` (closed).
Never use "now at close time".

A session may group **many** `QuizAttempt`s across **many** passages (passage lives on the
attempt).

## Strange paths designed around

| # | Path | Mitigation |
|---|------|------------|
| 1 | Abandoned session (tab closed) | Lazy sweep closes it on next entry: `completedAt = lastActivityAt` |
| 2 | Multiple tabs / devices | Advisory lock serializes ensure; one open session per user; backstop unique index |
| 3 | Empty / near-zero session | Daily `> 600s` threshold naturally excludes drive-by opens |
| 4 | `completedAt` meaning | Window end: set by inactivity close; open session uses `lastActivityAt` as end for sums |
| 5 | AFK with visible tab | Accepted for MVP; only visible-tab pings count |
| 6 | Retry passage | Client ensures session, then creates a new `QuizAttempt` |

## Phases

| Phase | Name | Migration | Depends on | Status |
|-------|------|-----------|-----------|--------|
| 1 | Backend: `@@map` fix + `lastActivityAt` rename + advisory-lock ensure + backstop unique index | regen init | Plan A | Completed |
| 2 | App-wide heartbeat: move mount from `/study` into `DashboardSidebar` | none | Phase 1 | Completed |
| 3 | Read-side: study-time streak (>10 min/day) + engagement analytics on the dashboard | none | Phase 1 | Completed |

## Verification commands

```bash
pnpm run typecheck
pnpm run lint
pnpm exec vitest src/lib/db/study-session-queries.test.ts --config tests/vitest/vitest.config.ts
pnpm exec vitest src/lib/db/quiz/quiz-review.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## Notes
- 10-minute idle window and the 10-minute streak threshold are constants
  (`SESSION_IDLE_MS`, `STREAK_MIN_DAILY_MS`); easy to tune later.
- No background job: inactivity close is lazy, evaluated inside `ensureActiveSession`.
- Future reviews (Plan B's `QuestionReview`) attach to the open session the same way quiz
  attempts do — the model is activity-agnostic by design.
- `quiz_attempts` analytics are unchanged (`totalQuizAttempts` / `avgQuizAccuracy` /
  `todayQuizAttempts` still read from `quiz_attempts`).

## Validation Log

### Session 1 — 2026-06-15

**Verification (Standard tier, 3 phases):** Claims checked 15 · Verified 15 · Failed 0 ·
Unverified 0. Confirmed: StudySession missing `@@map`; raw SQL targets `study_sessions`
(`study-session-queries.ts:29,42`); `ensureActiveSession`/`closeStaleStudySessions`/idle
constant already live; init migration creates `"StudySession"`; `DashboardSidebar` is
`"use client"` rendered by landing + `(dashboard)` layout; heartbeat at
`study-workspace-client.tsx:57`; quiz reuses session via `ensureStudySession`; streak from
`question_reviews` DISTINCT DATE; `/progress` redirects to `/`; landing uses `mockStats`
(`page.tsx:228`); existing `P2002` precedent at `vocabulary-set-queries.ts:190`.

**Decisions confirmed:**
1. **Race mechanism = transaction-level advisory lock** `pg_advisory_xact_lock(hashtext('study_session:'||userId))` at tx top; sweep→reuse→create in one tx. Unique index = backstop only; **no P2002 retry in hot path**. One open session per user (not per device).
2. **Idle timeout = 10 min** (`SESSION_IDLE_MS = 10*60*1000`; was 5 min).
3. **Rename `lastSeenAt` → `lastActivityAt`** across schema, migration, queries, tests.
4. **Time display = RAW seconds** for `timeStudiedTodaySeconds`/`timeStudiedWeekSeconds`; only `streakDays` + `activeDaysThisWeek` gated at >600s/day.
5. **Landing wiring scope = streak + time fields only**; other cards stay on `mockStats` for a later effort.

**Duration rule:** `lastActivityAt − startedAt` (open) / `completedAt − startedAt` (closed);
never "now at close". Sweep sets `completedAt = lastActivityAt`.
