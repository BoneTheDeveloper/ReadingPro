---
title: Plan FSRS vocabulary review
date: 2026-09-30
summary: Wrote a five-phase plan for the vocabulary schema redesign and FSRS review loop; no code changed.
---

# Plan FSRS vocabulary review

## What happened

Turned the accepted design page (https://claude.ai/artifact/X6mYdiorTZF1yE3e3o2d3X) into
`plans/260930-0640-fsrs-vocabulary-review/`: schema and status contract, save context and
translation cache, vocabulary sets, FSRS scheduler and review API, review screen and docs.
No source code or schema was changed.

## Decisions

- Sets at `/api/vocabulary-set` and review at `/api/review`, both in the server vocabulary module.
- `ReviewLog.learningSteps` added beyond the design so the stored before-state is complete.
- A card with `scheduledDays` 0 after a rating is requeued in the same client session.
- No test runner exists, so each phase verifies with typecheck, lint, build, knip, and curl checks.
- ts-fsrs API names were checked against documentation only; phase 4 confirms them against installed types.

## Next steps

- Decide whether the deployed database is reset or baselined before phase 1.
- Confirm `"PRO"` as the tier value and 50 as the generated-set cap.
- Run `/ak:cook plans/260930-0640-fsrs-vocabulary-review/plan.md`.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
