---
phase: 4
title: "Rename components folder to ui"
status: completed
priority: P2
effort: "20m"
dependencies: [0]
---

# Phase 4: Rename components folder to ui

## Overview

`progress/` and `reading/` use `components/` while every other feature uses `ui/`. Rename +
import update, no logic changes.

## Requirements

- Functional: app behavior unchanged.
- Non-functional: no feature directory named `components/` remains; both use `ui/`.

## Related Code Files

| Move | To |
|---|---|
| `src/features/progress/components/progress-dashboard.tsx` | `src/features/progress/ui/progress-dashboard.tsx` |
| `src/features/reading/components/content-panel.tsx` | `src/features/reading/ui/content-panel.tsx` |

Known importers (grep-verified 2026-07-07):

- **content-panel**: `src/app/[locale]/(dashboard)/study/_components/study-workspace-client.tsx` (imports `StudyContentPanel`)
- **progress-dashboard**: **zero importers found.** `ProgressDashboard` is exported but never
  imported anywhere in `src/` or `app/`; `/progress` route (`src/app/[locale]/(dashboard)/progress/page.tsx`)
  is just a `redirect("/")` stub. This looks like dead code, not a wiring gap this plan should
  fix — move the file per the rename rule (Success Criteria only requires no `components/` dir
  remains) but do not attempt to wire it up; flag to the user as a separate follow-up if they
  want it either connected or deleted.

## Implementation Steps

1. `git mv src/features/progress/components/progress-dashboard.tsx src/features/progress/ui/progress-dashboard.tsx` — no importer to update (confirmed dead code); remove the now-empty `components/` dir.
2. `git mv src/features/reading/components/content-panel.tsx src/features/reading/ui/content-panel.tsx`; update the import in `study-workspace-client.tsx`; remove the now-empty `components/` dir.
3. Re-grep `features/progress/components` and `features/reading/components` across `src/` and `app/` to confirm zero remaining hits.
4. `pnpm run typecheck && pnpm run lint`.

## Success Criteria

- [x] Both files live under `ui/`; no `components/` directory remains in either feature
- [x] `study-workspace-client.tsx` import updated for `content-panel`
- [x] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Very low. One open question surfaced, not a risk to this phase: `ProgressDashboard` has no
consumers — confirm with the user separately whether it should be wired into a route or deleted;
out of scope for this format-only plan.
