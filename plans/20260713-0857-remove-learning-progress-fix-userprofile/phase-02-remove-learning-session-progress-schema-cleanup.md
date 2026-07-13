---
phase: 2
title: Remove learning-session + progress + schema cleanup
status: completed
priority: P2
effort: 1-2h
dependencies:
  - 1
---

# Phase 2: Remove learning-session + progress + schema cleanup

## Overview

Delete the `learning-session` tracker and the `progress` feature (its only
consumer), plus the `StudySession` model / `study_sessions` table. Deferred until
core services are done. DB refresh is acceptable → drop the table outright.

## Requirements

- Functional: app builds and runs with dashboard + landing intact; no dangling
  imports; `/progress` route gone; `study_sessions` table dropped.
- Non-functional: no half-removed references left (grep-clean).

## Architecture

Dependency map (verified):

- `learning-session` referenced only by `(dashboard)/layout.tsx` (mounts
  `<LearningSessionTracker/>`) + its own folder + the DB model.
- `progress` consumed by: its own folder, `/progress` page, landing
  `page.tsx:276` (`getUserProgress`), `dashboard-sidebar.tsx:50` (active-path
  check).
- Landing `page.tsx` owns `UserProgress` type, `mockStats`, `getProgressCards`,
  `getMomentumCopy` **locally**; only `getUserProgress` is imported from
  `features/progress`.

**Decision (confirm before coding):** feed landing from local `mockStats` and
delete the `progress` feature (recommended, minimal), vs fully strip progress
cards from the landing hero. Steps below assume the recommended path.

## Related Code Files

- Delete: `src/features/learning-session/` (whole folder)
- Delete: `src/features/progress/` (whole folder)
- Delete: `src/app/[locale]/(dashboard)/progress/` (route dir, `page.tsx`)
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` — remove import + `<LearningSessionTracker/>`
- Modify: `src/app/[locale]/page.tsx` — remove `getUserProgress` import (line 20) + its call/ternary (~line 276-291); set `stats = mockStats`
- Modify: `src/components/layout/dashboard-sidebar.tsx` — line 50, drop `|| pathname === "/progress"`
- Modify: `prisma/schema.prisma` — delete model `StudySession` (~line 497), delete `studySessions StudySession[]` from `UserProfile` (~line 138)

## Implementation Steps

1. Remove the tracker mount: in `(dashboard)/layout.tsx` delete the
   `LearningSessionTracker` import and its `<LearningSessionTracker />` usage.
2. Decouple the landing: in `page.tsx` remove the `getUserProgress` import; replace
   the `const progress = user ? await getUserProgress(user.id) : null;` block and
   the `stats` ternary with `const stats: UserProgress = mockStats;`. Keep
   `mockStats`, `getProgressCards`, `getMomentumCopy`, and the progress-card render
   as a static placeholder. Confirm nothing else in the file reads `progress`.
3. Fix the sidebar active-path: in `dashboard-sidebar.tsx` line 50, drop the
   `|| pathname === "/progress"` clause (verify what nav item this belongs to; keep
   the `/` behavior).
4. Delete the folders/route: `src/features/learning-session/`,
   `src/features/progress/`, `src/app/[locale]/(dashboard)/progress/`.
5. Prisma schema cleanup: delete model `StudySession` and the `studySessions`
   relation field on `UserProfile`. Then:
   ```bash
   pnpm prisma generate --generator client
   pnpm prisma db push   # drops study_sessions (DB refresh OK)
   ```
6. Grep sweep — zero matches outside `src/generated/`:
   ```bash
   grep -rn "learning-session\|LearningSession\|StudySession\|study_sessions\|getUserProgress\|features/progress" src/ | grep -v src/generated
   ```

## Success Criteria

- [ ] `src/features/learning-session/` and `src/features/progress/` deleted
- [ ] `/progress` route deleted; sidebar no longer references it
- [ ] `(dashboard)/layout.tsx` no longer mounts the tracker
- [ ] Landing renders from `mockStats`; no `getUserProgress` reference
- [ ] `StudySession` model + `studySessions` relation removed; `study_sessions`
      table dropped; `prisma generate` succeeds
- [ ] Grep sweep returns nothing outside `src/generated/`
- [ ] `pnpm run typecheck` + `pnpm run lint` pass

## Risk Assessment

- **Landing breakage from decoupling** → `mockStats` already exists with the right
  shape; low risk. Verify the page renders after edit.
- **Missed reference** → the grep sweep (Step 6) is the gate; do not mark complete
  until clean.
- **Prisma client stale** → always `prisma generate` after schema edit before
  typecheck.
