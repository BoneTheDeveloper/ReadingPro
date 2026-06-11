---
title: "GH-64 Passage-scoped Study Results Cache"
description: "Replace global ArtifactItem[] with passage-scoped resultsByPassageId cache, add GET /api/study-results aggregate route, refactor use-study-actions/use-study-workspace-state to per-passage state, update right-panel rendering, and fix tests."
status: complete
priority: P2
branch: "feat/64-persist-quiz-completion"
tags: [study, cache, race-condition, artifact, GH-64]
blockedBy: []
blocks: []
created: "2026-06-10T15:36:21.117Z"
createdBy: "ck:plan"
source: skill
---

# GH-64 Passage-scoped Study Results Cache

## Overview

Replace the global `StudioItem[]` + `viewingArtifactId` in the Study page with a passage-scoped results cache (`resultsByPassageId`) and per-passage viewing state. Add a lightweight aggregate API to reconstruct results from DB on refresh. Prevent stale-response race conditions when switching passages quickly.

**Problem:** Artifacts are in React state only. Switching passages leaks results across passages. Refresh loses everything. Stale fetches overwrite current state.

**Solution:** Passage-scoped cache + aggregate metadata API + optimistic generation + race-safe writes.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Replace ArtifactItem types with passage-scoped StudioResult/ResultsCacheEntry](./phase-01-update-types.md) | Done |
| 2 | [Add GET /api/study-results aggregate metadata endpoint](./phase-02-create-aggregate-api-route.md) | Done |
| 3 | [Refactor use-study-actions and workspace state to passage-scoped cache](./phase-03-refactor-state-and-actions.md) | Done |
| 4 | [Rewire right-panel and page-client to consume passage-scoped results](./phase-04-update-right-panel-rendering.md) | Done |
| 5 | [Update use-study-actions and workspace-state tests for new state shape](./phase-05-update-tests.md) | Done |

## Dependencies

None. This is self-contained within the Study feature.

## Key Design Decisions

1. **No generic Artifact DB table** — Use concrete tables (Question, Passage.simplifiedContent) as source of truth. Frontend uses `StudioResult` as a view model only.
2. **Passage-scoped cache** — `resultsByPassageId: Record<string, ResultsCacheEntry>` replaces flat `artifacts: StudioItem[]`.
3. **Aggregate API** — `GET /api/study-results?passageId=...` returns metadata only, aggregates from concrete tables.
4. **Detail fetch on open** — Quiz questions and summary content fetched only when user opens a result, not at list time.
5. **Manual cache with stale time** — 60s stale time. No TanStack Query (keeping it simple for MVP).
6. **Race-safe writes** — All state writes target `resultsByPassageId[capturedPassageId]`, never a global "current" slot.

## Related Code Files

- `src/features/study/study-types.ts` — types
- `src/features/study/use-study-actions.ts` — artifact generation
- `src/features/study/use-study-workspace-state.ts` — workspace state
- `src/features/study/studio/right-panel.tsx` — results rendering
- `src/features/study/page/page-client.tsx` — main client
- `src/features/study/services/passage-study-service.ts` — backend service
- `prisma/schema.prisma` — Question, Passage models
