---
phase: 3
title: "Rebind vocabulary scheduling to simpleSchedule()"
status: pending
priority: P3
effort: "2h"
dependencies: [1]
---

# Phase 3: Rebind vocabulary scheduling to simpleSchedule()

## Overview
Route vocabulary review scheduling through the shared `simpleSchedule()` so all SRS
math lives in `srs/scheduler.ts`. `VocabularyItem` row shape is unchanged; only the
code that sets `nextReviewAt`/`lastReviewedAt`/`status` is rebound.

## Requirements
- Functional: a vocabulary review computes `nextReviewAt` + `status` via
  `simpleSchedule()` instead of ad-hoc/manual status setting, consistent with ADR 0005.
- Non-functional: no schema change; no change to dictionary (read-only reference).

## Architecture
Vocabulary maps `simpleSchedule()` interval output to its own status vocabulary
(`NEW`/`LEARNING`/`MASTERED`) and writes `nextReviewAt = result.nextReviewDate`,
`lastReviewedAt = now`. The mapping (interval → status) is the only vocabulary-specific
bit; the schedule math stays in the shared module.

## Related Code Files
- Modify: `src/lib/db/vocabulary-queries.ts` — the review/status-update path: call
  `simpleSchedule()` and persist `nextReviewAt`/`lastReviewedAt`/`status`.
- Read for context: `docs/ADR/0005-vocabulary-review-mvp-path.md`,
  `docs/Database/srs.md`, `docs/Flows/vocabulary-flow.md`.

## Implementation Steps
1. Identify the vocabulary review/status mutation in `vocabulary-queries.ts`
   (around the `status` update at ~line 168 and the `nextReviewAt` preserve logic).
2. Replace manual status setting with a call to `simpleSchedule()` + an interval→status
   mapping helper.
3. Persist `nextReviewAt`, `lastReviewedAt`, `status` from the result.
4. Add/extend tests for the vocabulary scheduling mapping.
5. Run verification.

## Success Criteria
- [ ] Vocabulary scheduling calls `simpleSchedule()`; no interval math inline in
      `vocabulary-queries.ts`.
- [ ] `nextReviewAt`/`status` set consistently with ADR 0005.
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Confirm current vocabulary review behavior before rebinding; ADR 0005 marks this an
  MVP path, so keep the status ladder simple and documented.
- Dictionary must remain untouched — verify no scheduling import leaks into dictionary code.
