---
title: "Plan C — Multi-activity session model (presence window)"
description: "Redefine StudySession as a simple presence window decoupled from study-activity type. START on app entry when no open session exists; CLOSE after ~5 min inactivity. Study events (quiz attempts, future reviews) attach to whichever session is open. Replaces the current always-new-session-per-quiz 1:1 behavior."
status: pending
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: [feature, data-model, session, lifecycle]
blockedBy: [project:260615-studysession-quiz-session-role]
blocks: []
created: "2026-06-15"
revised: "2026-06-15"
createdBy: "brainstorm"
source: skill
---

# Plan C — Multi-activity session model (D1)

> Resolves decision **D1**: a session is a **simple presence window**, not a quiz wrapper.
> Builds on **Plan A**'s cleaned-up `StudySession` (WHO/WHEN/lifecycle only).

## Decision (resolved)

Session = presence window, **decoupled from study-activity type**:
- **START:** on app entry, when no open session exists.
- **CLOSE:** after ~5 min of inactivity.
- **Attach:** study events (quiz attempts now; reviews later) attach to whichever session
  is currently open.

This is the minimal production-viable model; richer lifecycle (explicit start/end UI,
abandonment analytics) is deliberately deferred.

## Current state (verified)

`createQuizAttemptForPassage` (`quiz-attempt-client.ts:11`) **always** POSTs a new
StudySession per quiz, forcing the rigid 1:1 that this plan removes. After Plan A the
session row is WHO/WHEN/`completedAt` only.

## Target behavior

```
App entry  -> ensureActiveSession(userId):
                close any open session idle > 5 min (completedAt = lastSeenAt)
                reuse newest open session if fresh, else create new
Heartbeat  -> bump lastSeenAt on the open session while the user is active
Quiz start -> ensureActiveSession() then create a QuizAttempt on it (N attempts / session)
Close      -> lazy on next ensureActiveSession sweep (no cron needed)
```

`StudySession` gains `lastSeenAt DateTime @default(now())` to drive inactivity close.
A session may group **many** `QuizAttempt`s across **many** passages (passage lives on
the attempt).

## Strange paths designed around

| # | Path | Mitigation |
|---|------|------------|
| 1 | Abandoned session (tab closed) | Lazy sweep closes it on next entry: `completedAt = lastSeenAt` |
| 2 | Multiple tabs / devices | "Reuse newest open session" merges activity into one window |
| 3 | Empty session (no attempt) | Acceptable; filter `≥1 attempt` when surfacing stats |
| 4 | `completedAt` meaning | Set only by the inactivity close (window end), not per attempt |
| 6 | Retry passage | Client ensures session, then creates a new `QuizAttempt` |

## Phases

| Phase | Name | Migration | Depends on | Status |
|-------|------|-----------|-----------|--------|
| 1 | Backend: `lastSeenAt` column + `ensureActiveSession()` (reuse/close-stale/create) | add column | Plan A | Pending |
| 2 | Client wiring: app-entry ensure + heartbeat; quiz flow reuses session instead of creating one | none | Phase 1 | Pending |

## Verification commands

```bash
pnpm run typecheck
pnpm run lint
pnpm exec vitest tests/vitest/integration/api/study-session-route.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## Notes
- 5-minute window is a constant (`SESSION_IDLE_MS`); easy to tune later.
- No background job: inactivity close is lazy, evaluated inside `ensureActiveSession`.
- Future reviews (Plan B's `QuestionReview`) attach to the open session the same way
  quiz attempts do — the model is activity-agnostic by design.
