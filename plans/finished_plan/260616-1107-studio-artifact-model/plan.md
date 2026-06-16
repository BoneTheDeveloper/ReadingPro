---
title: "StudioArtifact model with type-specific content storage"
description: ""
status: pending
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: []
blockedBy: []
blocks: [project:260615-issue-69-study-quiz-flow]
created: "2026-06-16T04:08:57.880Z"
createdBy: "ck:plan"
source: skill
---

# StudioArtifact model with type-specific content storage

## Overview

Make the artifact data model coherent so the Studio panel can list and lazy-load
generated outputs correctly. Two problems today:

1. **Naming drift** — Prisma model is `StudyArtifact` / `db.studyArtifact`, but the code
   type and panel are `StudioArtifact` / "Studio". Rename the model + table to match.
2. **Content storage is wrong for "many artifacts per passage"** — artifact detail loads
   quiz questions by `passageId`, and generation does `deleteMany({ passageId })` +
   `createMany`. That is a one-quiz-per-passage design: a second quiz overwrites the first,
   and two artifacts for one passage load the *same* questions. The user wants many
   artifacts per passage, with each type's content in its **own relational table keyed by
   `artifactId`** — never a shared blob mixing quiz/flashcard shapes.

Decisions confirmed in brainstorm + validation:
- Artifacts = generated **outputs only** (quiz now; flashcard later). Chat/translate are not
  artifacts. Only real artifact type today is `quiz`.
- Content storage = **type-specific relational tables keyed by `artifactId`**. Quiz content
  stays in `questions`; add `artifactId` FK. No single model holds multiple types' content.
- `Question.artifactId` is **NOT NULL**; the migration **wipes existing `questions`** (dev data) to
  satisfy it. Old quizzes disappear — accepted, no backfill.
- **Drop `StudioArtifact.content` jsonb** — unused (`StudioArtifactContent = null`), and
  keeping it invites the exact "one model, many types" mixing the user rejected.
- The live generation path is the `/api/study-questions` **route**; the server action
  `study-generate-questions-action.ts` is **dead code and gets deleted**.
- The `study_artifacts` table is **unmigrated** (not in `20260616025524_init`), so rename +
  schema changes land in a fresh migration with no rename/backfill cost.

This plan **blocks** `260615-issue-69-study-quiz-flow` — finish the model before the quiz-flow work.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Database schema & migration](./phase-01-database-schema-migration.md) | Completed |
| 2 | [Server generation & wiring](./phase-02-server-generation-wiring.md) | Completed |
| 3 | [Client types & tests](./phase-03-client-types-tests.md) | Pending |

Key dependencies: Phase 2 depends on Phase 1 (needs `db.studioArtifact` + `Question.artifactId`
generated). Phase 3 depends on Phase 2 (tests verify the final server contract).

## Verification commands

```bash
pnpm run db:generate
pnpm run typecheck
pnpm run lint
pnpm exec vitest src/features/study/hooks/use-study-actions.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## Open questions (non-blocking)

- "Many quizzes per passage" means SRS review pool (`getNewCards`, `quiz-review`) holds
  near-duplicate questions across regenerations. Acceptable for now; a "supersede previous
  quiz" rule is a later product decision, no schema impact.
- Studio panel's `isActionLocked` / `maxConcurrent` duplicate-generation UX is issue-69 territory,
  out of scope here.

## Dependencies

- **blocks** `project:260615-issue-69-study-quiz-flow` — quiz-flow work builds on this model.

## Validation Log

### Verification Results (Standard tier, 3 phases)
- Claims checked: 12 | Verified: 12 | Failed: 0 | Unverified: 0
- Verified: `study_artifacts` not in `20260616025524_init` (unmigrated); `Question` has only
  `passageId` (no `artifactId`); `generateQuestionsForPassage` does `deleteMany({passageId})` +
  `createMany` (`passage-study.service.ts:76-77`); `studyLoadArtifactDetailAction` queries by
  `passageId` (`study-artifact-actions.ts:80`); relation field `studyArtifacts` on
  `UserProfile`/`Passage` with **no code references**; `/api/study-questions/route.ts` is the live
  path calling the service directly; `db:generate` + `db:migrate:dev` scripts exist;
  `loadStudioArtifactContent` unused outside its own module; `questionDataSchema` at
  `passage-queries.ts:10`.
- New finding: `studyGenerateQuestionsAction` (`study-generate-questions-action.ts`) is **dead code**
  — never imported anywhere.

### Interview Decisions (Session 1)
- **Dead action** → delete `study-generate-questions-action.ts`; wire `artifactId` through the route only.
- **`Question.artifactId` nullability** → **NOT NULL**; migration wipes existing `questions`
  (cascades to `question_reviews`). Dev data loss accepted.
- **Old quizzes** → no backfill; pre-existing questions are wiped and those passages show no quiz
  until regenerated.
- **`content` column** → drop entirely.

### Whole-Plan Consistency Sweep
- Re-read `plan.md` + all phase files after propagation. Nullable→NOT NULL, dead-action delete, and
  route-as-live-path reconciled across overview, Phase 1, and Phase 2. Phase 3 unaffected (client
  passes `artifactId`; no action reference). No remaining contradictions or stale terms.
