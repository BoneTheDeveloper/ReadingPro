---
phase: 5
title: "Progress Analytics and Release Verification"
status: pending
priority: P2
effort: "2d"
dependencies: [2, 3, 4]
---

# Phase 5: Progress Analytics and Release Verification

## Overview

Finish MVP hardening with progress analytics and release verification. This phase validates that card reviews, study sessions, vocabulary status metrics, and dashboard aggregates produce trustworthy learner-facing progress.

## Requirements

- Functional: progress stats accurately expose total cards, mature cards, due cards, today's reviews, streak, and any additional MVP session/vocabulary metrics chosen in Phase 4.
- Non-functional: aggregate queries are user-scoped, performant enough for dashboard loads, and covered by tests; release gates run in a predictable order.

## Architecture

Progress data comes from `CardReview`, `StudySession`, and `VocabularyItem` (status distribution from Phase 4). `GET /api/progress/stats` calls `getUserProgress`, and `ProgressDashboard` validates the response with shared schemas before rendering. Vocabulary metrics (total saved, NEW/LEARNING/MASTERED counts, due for review) are optional additions decided by product need.

## Related Code Files

- Modify: `src/lib/db/card-review-queries.ts`
- Modify: `src/lib/db/study-session-queries.ts`
- Modify: `src/app/api/progress/stats/route.ts`
- Modify: `src/app/api/study-session/route.ts`
- Modify: `src/lib/study/shared/study-response-schema.ts`
- Modify: `src/features/progress/progress-dashboard.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Modify: `tests/vitest/integration/api/routes.test.ts`
- Modify: `src/lib/db/card-review-queries.test.ts`
- Modify: `src/lib/db/study-session-queries.test.ts`
- Modify: `tests/vitest/integration/components/progress/progress-dashboard.integration.test.tsx`
- Modify: `tests/performance/query-budget-benchmarks.md`
- Modify: `tests/performance/run-benchmarks.ts`
- Create: `tests/performance/progress-flow-benchmark.ts`
- Modify: `playwright/tests/authenticated-smoke.spec.ts`
- Modify: `docs/API/Routes/progress-feature.md`
- Modify: `docs/Flows/spaced-repetition-flow.md`
- Modify: `docs/Operations/deployment-runbook.md`
- Modify: `docs/project-roadmap.md`

## Implementation Steps

1. Confirm progress metrics against the product docs. Decide whether vocabulary status distribution (NEW/LEARNING/MASTERED counts, due for review count) joins the progress stats response for MVP.
2. Add unit tests for aggregate query edge cases: no cards, due cards, mature cards, today boundary, streak continuity, and multi-user isolation.
3. Add route tests for auth, stable errors, and success schema for progress and study-session routes.
4. Update `ProgressDashboard` for loading, empty, error, and metric display states without changing layout more than necessary.
5. Add a progress benchmark only if query-count behavior becomes important; otherwise document why the route remains outside hard budgets.
6. Run release gates in order: typecheck, lint, Vitest, performance, build, targeted Playwright/authenticated smoke.
7. Update roadmap and deployment runbook with final hardening status and any deferred follow-ups.

## Success Criteria

- [ ] Progress aggregates are correct for empty, active, mature, due, today, streak, and multi-user cases.
- [ ] Progress UI validates route responses and handles loading, empty, and error states.
- [ ] Study-session and progress docs match implemented route behavior.
- [ ] Release gates pass or any failures are documented with owner/action.
- [ ] `docs/project-roadmap.md` accurately reflects completed hardening and deferred items.

## Risk Assessment

Risk: date-based streak tests can be timezone-sensitive. Mitigation: inject fixed dates or use deterministic fixtures around UTC/local boundaries.

Risk: adding progress benchmarks before route behavior matters can create maintenance noise. Mitigation: add the benchmark only if the query shape is changed or starts to affect dashboard latency.
