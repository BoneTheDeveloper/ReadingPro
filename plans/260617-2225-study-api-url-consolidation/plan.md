---
title: Study API URL Consolidation
description: ''
status: completed
priority: P2
branch: feature/issue-69-study-quiz-flow
tags: []
blockedBy: []
blocks: []
created: '2026-06-17T15:25:26.748Z'
createdBy: 'ck:plan'
source: skill
---

# Study API URL Consolidation

## Overview

Consolidate the Study bounded context's API URLs so the URL structure matches the
server module (`src/server/modules/study`). Today the domain is fragmented across
five top-level prefixes (`study/*`, `study-chat`, `study-session`, `studio-questions`,
`studio-artifacts`). Target: nest all of them under `/api/study/*`.

This is a **breaking** URL change with a small, fully-enumerated blast radius:
route directory moves under `src/app/api/`, study client URL literals, and the
tests that assert those URLs or import the route handlers. Behavior is unchanged —
this is a pure rename. TDD approach: tests assert the new contract first (red),
then route moves + URL flips make them pass (green).

### URL moves (per `docs/API/api-index.md` → Planned URL Consolidation)

| Current | Target |
|---------|--------|
| `/api/study-chat` (GET, POST) | `/api/study/chat` |
| `/api/study-session` (POST) | `/api/study/sessions` |
| `/api/studio-questions` (POST) | `/api/study/questions` |
| `/api/studio-artifacts` (GET) | `/api/study/artifacts` |
| `/api/studio-artifacts/[id]` (GET) | `/api/study/artifacts/[id]` |
| `/api/studio-artifacts/[id]/quiz-result` (POST, DELETE) | `/api/study/artifacts/[id]/quiz-result` |
| `/api/study/passages*` | unchanged |

### Out of scope (do NOT change)

- Server file/symbol names (`chat-service.ts`, `studio-artifacts-service.ts`,
  `study-session-queries.ts`) — internal naming, unrelated to URL.
- UI folder names (`src/features/study/ui/studio/`) — view concept, not API contract.
- `/api/vocabulary/[id]/review` and the rest of Vocabulary/Dictionary/Progress/Upload.
- `vitest.config.ts:20-21` already reference a stale `src/features/study/api/` path
  (real dir is `api-client/`) — pre-existing dead config; note but do not fix here.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Centralize study route URLs](./phase-01-centralize-study-route-urls.md) | Completed |
| 2 | [Move study routes (TDD)](./phase-02-move-study-routes-tdd.md) | Completed |
| 3 | [Docs sync and verification](./phase-03-docs-sync-and-verification.md) | Completed |

## Key Dependencies

- Phase 2 depends on Phase 1 (constants must exist before routes flip to them).
- Phase 3 depends on Phase 2 (docs flip to new URLs only after routes move).
- Branch `feature/issue-69-study-quiz-flow` carries the in-flight
  `studio-artifacts/[id]/quiz-result` route (moves with this refactor) and the
  `vocabulary/[id]/review` route (not affected). Land this refactor after issue-69
  behavior stabilizes to avoid churn on those files.

## Dependencies

No cross-plan dependencies. Docs in `docs/API/` were already restructured by domain
in a prior change; this plan flips the live URLs they describe.
