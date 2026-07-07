---
title: "Feature Slice Internal Format Standardization"
description: "Standardize the internal folder shape of each src/features/<feature> slice (schemas/, db/, services/, ui/) per the strict template agreed in brainstorm — pure file moves + import fixes, no logic changes."
status: completed
priority: P2
branch: "preview"
tags: [refactor, features, format]
blockedBy: []
blocks: []
created: "2026-07-07T08:02:14.390Z"
createdBy: "ck:plan"
source: skill
---

# Feature Slice Internal Format Standardization

## Overview

Derived from brainstorm report
[plans/reports/20260707-feature-slice-internal-format-standardization.md](../reports/20260707-feature-slice-internal-format-standardization.md).
Strict template: every feature slice keeps schema files under `schemas/`, repository files under
`db/`, business-logic files under `services/` (never mixed into `db/`), and React components
under `ui/` (never `components/`). 16 files across 8 features currently violate this. All moves
are mechanical — `git mv` + import path fixes — no behavior or logic changes anywhere.

**Phase 0 is a prerequisite, not part of the format work:** `pnpm run typecheck` currently fails
with 6 pre-existing errors, leftover from an earlier, incomplete restructure plan
(`plans/20260706-1751-src-feature-colocation-restructure/`, phases 13-14 marked "complete" but not
actually finished on disk). Phase 0 fixes those 5 broken import paths so later phases have a clean
typecheck baseline to verify against.

**Explicitly out of scope** (per user decision during brainstorm): `features/study/` type-hub
dissolution, `studio-panel` → `studio` rename, `source-panel`/`ai-chat` domain-boundary questions —
these belong to the old restructure plan's unfinished phases 13-14, not this one.

**Per-phase discipline:** run `pnpm run typecheck && pnpm run lint` after every phase before
moving to the next; each phase's importer list was grep-verified 2026-07-07 but must be re-grepped
at execution time in case new importers were added since.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 0 | [Fix pre-existing broken imports](./phase-00-fix-pre-existing-broken-imports.md) | Completed |
| 1 | [Schema files into schemas folder](./phase-01-schema-files-into-schemas-folder.md) | Completed |
| 2 | [Service files split from db](./phase-02-service-files-split-from-db.md) | Completed |
| 3 | [Learning-session queries into db folder](./phase-03-learning-session-queries-into-db-folder.md) | Completed |
| 4 | [Rename components folder to ui](./phase-04-rename-components-folder-to-ui.md) | Completed |
| 5 | [Ai-chat service and lib split](./phase-05-ai-chat-service-and-lib-split.md) | Completed |

## Dependencies

Phases 1-5 all depend on Phase 0 (clean typecheck baseline) but are otherwise independent of each
other — different features, no shared files — so they can run in any order after Phase 0, though
sequential (1→5) is simplest to review.

No dependency on `plans/20260706-1751-src-feature-colocation-restructure/` — that plan's remaining
phase 13-14 work is explicitly out of scope here and does not block or get blocked by this plan.
