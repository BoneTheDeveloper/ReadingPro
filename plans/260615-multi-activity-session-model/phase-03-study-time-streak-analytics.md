---
phase: 3
title: "Read-side: study-time streak (>10 min/day) + engagement analytics"
status: completed
priority: P2
effort: "5h"
dependencies: [1]
---

# Phase 3: Read-side — study-time streak + engagement analytics

<!-- Updated: Validation Session 1 - raw-seconds time, streak+time wiring scope only, lastActivityAt -->

## Overview
Make sessions a read-side data source: a streak where a day counts only when total study
time `> 10 min`, plus engagement metrics (time today, time this week, active days this week),
surfaced on the dashboard. Replaces the dormant `question_reviews`-based streak.

**Wiring scope (validated):** call `getUserProgress` on the landing page and replace **only**
`streakDays` + the three time fields with real data — merge over `mockStats`
(`{ ...mockStats, streakDays, timeStudiedTodaySeconds, ... }`). Other cards (`totalCards`,
`dueCards`, etc.) **stay on `mockStats`** for a later effort. `timeStudiedTodaySeconds` /
`timeStudiedWeekSeconds` are **raw seconds** (ungated); only `streakDays` /
`activeDaysThisWeek` apply the `> 600s`/day gate.

## Key insight
`getUserProgress` (`src/lib/db/quiz/quiz-review.ts`) already builds the streak from a
`DISTINCT DATE(reviewedAt)` set over `question_reviews`. Swap that source to per-day
**summed session time** over `study_sessions` with a `> 600s` threshold;
`getCurrentStreakDays` stays untouched (still consumes a set of qualifying day-keys). The
`/progress` route just `redirect("/")`, so the real surface is the landing page
`[locale]/page.tsx`, which currently renders hardcoded `mockStats` and must be wired to real
data.

## Requirements
- Functional:
  - `streakDays` = consecutive days ending today where summed session time `> 600s`.
  - New fields: `timeStudiedTodaySeconds`, `timeStudiedWeekSeconds`, `activeDaysThisWeek`.
  - Session time per day = `SUM(COALESCE(completedAt, lastActivityAt) - startedAt)`, bucketed by
    `DATE(startedAt)` in server tz.
  - Open (not-yet-closed) sessions contribute time via `lastActivityAt`.
  - Dashboard shows real `streakDays` + time fields; other cards remain on `mockStats`.
- Non-functional: single aggregate query for the new metrics; no N+1.

## Architecture
```
getUserProgress(userId):  // add a 4th parallel $queryRaw
  SELECT DATE("startedAt") AS day,
         SUM(EXTRACT(EPOCH FROM (COALESCE("completedAt","lastActivityAt") - "startedAt"))) AS secs
  FROM "study_sessions"
  WHERE "userId" = $1
  GROUP BY day
  HAVING SUM(EXTRACT(EPOCH FROM (COALESCE("completedAt","lastActivityAt") - "startedAt"))) > 600
  ORDER BY day DESC
  LIMIT 60

  streakDays            = getCurrentStreakDays(set of qualifying day keys)   // unchanged
  timeStudiedTodaySeconds = today's bucket secs (0 if below threshold? -> report raw secs)
  timeStudiedWeekSeconds  = sum of secs over last 7 days
  activeDaysThisWeek      = count of qualifying days within last 7 days
```
Decision: `timeStudiedToday/Week` report **raw** seconds (not threshold-gated) so the user
sees real time; only `streakDays`/`activeDaysThisWeek` apply the `> 600s` gate. Add
`STREAK_MIN_DAILY_MS = 10 * 60 * 1000` as the single source of the threshold.

## Related Code Files
- Modify: `src/lib/db/quiz/quiz-review.ts` — replace the `question_reviews` day query with the
  session-time query; compute the new fields; export `STREAK_MIN_DAILY_MS`.
- Modify: `src/lib/study/shared/study-response-schema.ts` — add
  `timeStudiedTodaySeconds`, `timeStudiedWeekSeconds`, `activeDaysThisWeek` to
  `progressStatsSchema` (+ `ProgressStatsDto`).
- Modify: `src/app/[locale]/page.tsx` — extend the `UserProgress` type, fetch real
  `getUserProgress`, render the new metrics; drop hardcoded streak/time from `mockStats`.
- Modify: `src/lib/db/quiz/quiz-review.test.ts` — streak `>10min` logic (qualifying vs
  sub-threshold day, open-session time via `lastActivityAt`, consecutive-day streak).

## Implementation Steps
1. Add `STREAK_MIN_DAILY_MS` constant; add the session-time `$queryRaw` to the
   `Promise.all` in `getUserProgress`.
2. Build the qualifying-day key set (secs `> 600`) → `getCurrentStreakDays` (unchanged).
3. Compute `timeStudiedTodaySeconds`, `timeStudiedWeekSeconds`, `activeDaysThisWeek` from the
   per-day rows; remove the `question_reviews` day query if no longer used.
4. Extend `progressStatsSchema` + `ProgressStatsDto` with the three fields.
5. Wire `[locale]/page.tsx` to real data: extend `UserProgress`, fetch `getUserProgress`,
   render metrics; keep `mockStats` only for any fields still intentionally mocked.
6. Update/add tests for streak + stats shape.
7. Run verification commands.

## Success Criteria
- [ ] A day with `> 10 min` total session time counts toward the streak; a `< 10 min` day
      breaks it.
- [ ] Open-session time is included via `lastActivityAt`.
- [ ] `progressStatsSchema` parses the new fields; dashboard renders real streak + time.
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Server-tz bucketing can misattribute sessions near midnight for users in other zones —
  accepted for MVP, documented; revisit with per-user tz.
- Streak source change is user-visible: existing users' streaks recompute from session time
  (review-only history won't count). Acceptable — SRS review UI is dormant.
- `EXTRACT(EPOCH ...)` returns double precision; cast/round to int seconds before returning.
