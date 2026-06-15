---
phase: 1
title: "Backend: lastSeenAt + ensureActiveSession()"
status: pending
priority: P2
effort: "4h"
dependencies: []
---

# Phase 1: Backend — lastSeenAt + ensureActiveSession()

## Overview
Add `lastSeenAt` to `StudySession` and implement `ensureActiveSession(userId)`: lazily
close stale open sessions (idle > 5 min), then reuse the newest still-open session or
create a new one. This is the core of the presence-window model.

## Requirements
- Functional:
  - `ensureActiveSession(userId)` returns exactly one open session id.
  - Before deciding, it closes every open session whose `lastSeenAt < now - 5min` by
    setting `completedAt = lastSeenAt`.
  - If a fresh open session remains, reuse it; else create a new one.
  - A heartbeat (`touchSession`) updates `lastSeenAt = now` for the open session.
- Non-functional: no background job; all close logic is lazy inside `ensureActiveSession`.
  Concurrency-safe enough for multi-tab (idempotent reuse-newest).

## Architecture
```
const SESSION_IDLE_MS = 5 * 60 * 1000;

ensureActiveSession(userId):
  closeStaleOpenSessions(userId)          // completedAt = lastSeenAt where idle
  open = newest StudySession where completedAt = null
  return open ?? create({ userId, startedAt: now, lastSeenAt: now })

touchSession(userId, sessionId):          // heartbeat
  update lastSeenAt = now where id = sessionId, completedAt = null
```
`lastSeenAt` indexed with `userId` for the stale sweep.

## Related Code Files
- Modify: `prisma/schema.prisma` — add `lastSeenAt DateTime @default(now())` to
  `StudySession`; add `@@index([userId, completedAt])` (open-session lookup).
- Create: `prisma/migrations/<ts>_add_studysession_last_seen_at/migration.sql`.
- Modify: `src/lib/db/study-session-queries.ts` — add `ensureActiveSession`,
  `closeStaleOpenSessions`, `touchSession`, and `SESSION_IDLE_MS`.
- Modify: `src/app/api/study-session/route.ts` — `POST` becomes "ensure active session"
  (idempotent), not "always create"; optionally add a lightweight heartbeat handler.
- Modify: `src/lib/study/shared/study-response-schema.ts` — include `lastSeenAt` if surfaced.

## Implementation Steps
1. Add `lastSeenAt` + index to `StudySession`; `pnpm prisma migrate dev --name add_studysession_last_seen_at`.
2. Implement `closeStaleOpenSessions(userId)` (update many: open + idle → `completedAt = lastSeenAt`).
3. Implement `ensureActiveSession(userId)` (sweep → reuse newest open → else create).
4. Implement `touchSession(userId, sessionId)` heartbeat.
5. Rework `POST /api/study-session` to call `ensureActiveSession` (returns existing or new).
6. Add unit/integration tests: reuse-when-fresh, create-when-none, close-when-stale,
   multi-call idempotency.
7. Run verification.

## Success Criteria
- [ ] Two `ensureActiveSession` calls within the window return the same session id.
- [ ] An open session idle > 5 min is closed with `completedAt = lastSeenAt` and a new
      one is created on next call.
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Multi-tab race: two simultaneous creates could yield two open sessions. Mitigate by
  reuse-newest on read; an optional unique partial index on `(userId) where completedAt is null`
  is a stronger guarantee — note as a follow-up, not required for MVP.
- Clock/timezone: use server `now()` consistently for the idle comparison.
