---
title: Remove CEFR AI Detection — Heuristic Only
description: >-
  Remove AI-powered CEFR detection call, keep heuristic-only approach. Saves
  ~800 tokens + latency per upload.
status: completed
priority: P2
branch: main
tags:
  - refactor
  - ai-cost-reduction
blockedBy: []
blocks: []
created: '2026-05-11T04:08:13.728Z'
createdBy: 'ck:plan'
source: skill
---

# Remove CEFR AI Detection — Heuristic Only

## Overview

Remove `detectCEFRLevel()` AI call from upload pipeline. The heuristic `getHeuristicCEFR()` provides sufficient accuracy for the only decision CEFR drives: whether to simplify text. Moves heuristic to `src/lib/shared/cefr-utils.ts`, deletes `src/lib/ai/cefr-detector.ts`.

**Why:** AI call returns 6 fields, only 1 used. Heuristic is right ~80% for the simplify/no-simplify binary. Cost savings: ~800 tokens + ~200ms latency per upload. No UX impact — badges still work, simplification still gates correctly.

**Brainstorm:** `plans/reports/brainstorm-260511-1105-remove-cefr-ai-call.md`

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Relocate Heuristic](./phase-01-relocate-heuristic.md) | Completed |
| 2 | [Update Callers](./phase-02-update-callers.md) | Completed |
| 3 | [Delete Old Module](./phase-03-delete-old-module.md) | Completed |
| 4 | [Verify Build](./phase-04-verify-build.md) | Completed |

## Dependencies

None. Independent refactor, no cross-plan conflicts.
