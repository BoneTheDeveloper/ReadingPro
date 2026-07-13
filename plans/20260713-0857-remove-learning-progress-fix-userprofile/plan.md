---
title: 'Remove learning-session + progress, fix UserProfile creation'
description: ''
status: completed
priority: P2
branch: preview
tags: []
blockedBy: []
blocks: []
created: '2026-07-13T01:58:51.538Z'
createdBy: 'ck:plan'
source: skill
---

# Remove learning-session + progress, fix UserProfile creation

## Overview

Two independent goals bundled because they touch the same area:

- **P0 (keep + fix):** guarantee every Better Auth user has a `UserProfile`
  (`profiles`) row. Verified live outage — `StudySession.create` and
  `UploadJob.create` both throw `P2003` FK violations because no code creates a
  profile. This blocks core features (upload, passages, vocabulary), not just the
  code being removed. Highest priority; ships independently.
- **Cut (defer):** remove the `learning-session` tracker and the `progress`
  feature that consumes it. Premature — engagement analytics before core services
  are done. DB refresh is acceptable (no prod data), so the `study_sessions`
  table is dropped outright.

**Constraints:** DB refresh allowed (`prisma db push`/migrate freely, no data to
preserve). No lazy per-repository profile upserts (DRY / separation of concerns).

**Key decision (Phase 2):** landing `src/app/[locale]/page.tsx` is tightly coupled
to the `UserProgress` shape (local `mockStats`, `getProgressCards`,
`getMomentumCopy`). Only `getUserProgress` comes from `features/progress`.
Recommended cut = drop the `getUserProgress` import/call, feed the existing
landing UI from local `mockStats` (static placeholder), delete the `progress`
feature + `/progress` route. Alternative = fully strip the progress cards from the
landing hero (more UI surgery). **Confirm before implementing Phase 2.**

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Fix UserProfile creation (P0)](./phase-01-fix-userprofile-creation-p0.md) | Completed |
| 2 | [Remove learning-session + progress + schema cleanup](./phase-02-remove-learning-session-progress-schema-cleanup.md) | Completed |
| 3 | [Docs fix + verification](./phase-03-docs-fix-verification.md) | Completed |

Phase 1 is independent and fixes a live outage — ship it first even alone.
Phases 2 → 3 follow. Phase 3 verifies all three.

## Dependencies

None (no other unfinished plans in `./plans/`). Phase 3 depends on Phases 1 + 2.
