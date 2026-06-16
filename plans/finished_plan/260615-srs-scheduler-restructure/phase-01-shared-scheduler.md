---
phase: 1
title: "Create shared srs/scheduler.ts"
status: completed
priority: P2
effort: "3h"
dependencies: []
---

# Phase 1: Create shared srs/scheduler.ts

## Overview
Establish `src/lib/srs/scheduler.ts` as the single home of SRS logic: promote the
existing SM-2 implementation into `sm2()` and add a `simpleSchedule()` for lightweight
interval review. Repoint all current importers to the new module.

## Requirements
- Functional: `sm2()` reproduces today's `calculateSM2` behavior exactly (same intervals,
  ease-factor clamp at 1.3, repetitions reset on quality < 3). `simpleSchedule()` returns
  a `{ intervalDays, nextReviewDate, status? }` from a prior state + a coarse outcome.
- Non-functional: no other module re-implements scheduling; `src/lib/algorithms/sm2.ts`
  is removed (or re-exports from the new module during transition, then deleted).

## Architecture
```
src/lib/srs/scheduler.ts
  export sm2(state: SrsState, quality: number): SrsResult        // = calculateSM2
  export simpleSchedule(state, outcome: 'again'|'good'|'easy'): SimpleResult
  export isDue(nextReviewDate): boolean                          // = isCardDue
  export statusFor(nextReviewDate, intervalDays): {...}          // = getCardStatus
  export suggestedRating(responseType): number                  // = getSuggestedRating
```
`simpleSchedule()` is content-agnostic: it returns intervals; callers map to their own
status vocabulary (vocabulary uses NEW/LEARNING/MASTERED).

## Related Code Files
- Create: `src/lib/srs/scheduler.ts` (moved + extended from `src/lib/algorithms/sm2.ts`).
- Create: `src/lib/srs/scheduler.test.ts` (port `sm2.test.ts`, add `simpleSchedule` cases).
- Modify: `src/lib/db/card-review-queries.ts` — import `sm2` from `srs/scheduler` instead
  of the local `calculateSM2`/`calculateSM2Interval` wrapper (the wrapper can be inlined).
- Delete: `src/lib/algorithms/sm2.ts` and `src/lib/algorithms/sm2.test.ts` once imports move.

## Implementation Steps
1. Create `src/lib/srs/scheduler.ts`; move `calculateSM2` → `sm2`, plus helpers.
2. Add `simpleSchedule(state, outcome)` with a fixed ladder (e.g. again→1d, good→
   prev*factor, easy→longer); return `nextReviewDate`.
3. Port tests to `srs/scheduler.test.ts`; add `simpleSchedule` coverage.
4. Repoint `card-review-queries.ts` to `sm2`; remove the local wrapper.
5. Grep for remaining `algorithms/sm2` imports; repoint all.
6. Delete `src/lib/algorithms/sm2.*`.
7. Run typecheck + tests.

## Success Criteria
- [ ] `srs/scheduler.ts` is the only file defining SM-2 / interval logic (`rg` clean for
      `algorithms/sm2`).
- [ ] `simpleSchedule()` unit-tested.
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
Low — mechanical move plus one new pure function. Keep `sm2()` output identical to avoid
regressing question-review intervals; the ported test guards this.
