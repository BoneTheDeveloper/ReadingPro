---
phase: 2
title: "App-wide heartbeat (mount in DashboardSidebar)"
status: completed
priority: P2
effort: "2h"
dependencies: [1]
---

# Phase 2: App-wide heartbeat

## Overview
Move the session heartbeat from the `/study` workspace to a shared authenticated surface so
presence (and therefore study time) is tracked on **every page after login**, not just the
reading workspace.

## Key insight
`DashboardSidebar` (`src/components/layout/dashboard-sidebar.tsx`) is already `"use client"`
and is rendered by **both** the landing page (`[locale]/page.tsx`) and the `(dashboard)`
layout that wraps every authenticated page (upload, vocabulary, progress, dictionary,
processing, study). It is the single common mount point. The quiz flow already reuses the
open session (`createQuizAttemptForPassage` → `ensureStudySession`), so no quiz change is
needed — verify only.

## Requirements
- Functional:
  - The heartbeat fires on entry to any authenticated page, every 60s, and on tab-focus,
    pinging `POST /api/study-session` only while the tab is visible.
  - It is mounted exactly once per page (no double-mount when both sidebar and a nested page
    render).
  - `/study` no longer mounts its own heartbeat.
- Non-functional: no visible UI; failures are swallowed to a Sentry breadcrumb (existing
  behavior in `use-study-session-heartbeat.ts`).

## Architecture
```
DashboardSidebar (client)  ──mounts──>  useStudySessionHeartbeat(true)
   rendered by:
     [locale]/page.tsx                 (landing dashboard)
     (dashboard)/layout.tsx            (all dashboard pages)
study-workspace-client.tsx            (heartbeat call REMOVED)
```
Auth is enforced upstream by `src/proxy.ts`; the API also 401s for anonymous, so an
unauthenticated render at worst makes a no-op call (acceptable; the breadcrumb path handles it).

## Related Code Files
- Modify: `src/components/layout/dashboard-sidebar.tsx` — call `useStudySessionHeartbeat(true)`.
- Modify: `src/features/study/ui/study-workspace-client.tsx` — remove the
  `useStudySessionHeartbeat(true)` call (line ~57) and its import.
- Read for context: `src/features/study/hooks/use-study-session-heartbeat.ts` (unchanged),
  `src/features/study/api/quiz-attempt-client.ts` (verify reuse, no change).

## Implementation Steps
1. Import and call `useStudySessionHeartbeat(true)` inside `DashboardSidebar`.
2. Remove the heartbeat call + now-unused import from `study-workspace-client.tsx`.
3. Verify the hook is not double-mounted (sidebar is the only caller after this change).
4. Manually confirm a ping fires on a non-study page (e.g. `/vocabulary`) and `lastActivityAt`
   advances.
5. Run verification commands.

## Success Criteria
- [ ] Opening any authenticated page issues a `POST /api/study-session` within ~1s.
- [ ] `lastActivityAt` advances while on a non-`/study` page.
- [ ] No duplicate heartbeat (single network ping per 60s while visible).
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Heartbeat on every page = one `POST` / 60s / active user. Cheap; `ensureActiveSession` is a
  single small transaction. Revisit if write volume becomes a concern.
- If a future authenticated layout does not render `DashboardSidebar`, it would miss the
  heartbeat — document the sidebar as the canonical mount point.
