---
phase: 1
title: "Server-authoritative atomic generation"
status: pending
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Server-authoritative atomic generation

## Overview
Move artifact creation + question persistence + `done` status into a single DB
transaction inside the generation request. The route returns both the artifact
and its questions. After this phase the server alone owns the lifecycle; no client
pre-create or post-complete round-trip is needed.

## Requirements
- Functional: `POST /api/studio-questions` runs the LLM, then on success persists
  `StudioArtifact(status:"done")` + its `Question` rows in one `db.$transaction`,
  and returns `{ artifact, questions }`. On any failure nothing is persisted.
- Functional: idempotent on the client-supplied `artifactId` — if a row with that
  id already exists, return its existing artifact + questions instead of inserting
  a duplicate (handles double-submit / retry).
- Non-functional: LLM call stays OUTSIDE the transaction (transaction is
  insert-only and short). Existing 45s generation timeout (`withGenerationTimeout`)
  is preserved. Auth + passage ownership unchanged.

## Architecture
```
POST /api/studio-questions { passageId, artifactId }
  authenticate → getOwnedPassage(userId, passageId)   (title derived server-side)
  run LLM (withGenerationTimeout)  ← outside txn
  validate questions
  db.$transaction([
    studioArtifact.create({ id: artifactId, status: "done", type:"quiz", title, passageId, userId }),
    question.createMany({ data: validQuestions.map(...) }),
  ])   ← if artifactId exists: short-circuit to read existing + return
  return { success, data: { artifact, questions } }
```
- `generateQuestionsForPassage` returns `{ artifact: StudioArtifact, questions: GeneratedStudyQuestionDto[] }`.
- Title comes from the owned passage (`passage.title`), so the client no longer
  needs to send it.

## Related Code Files
- Modify: `src/lib/study/passage/passage-study.service.ts` — wrap create+createMany
  in `db.$transaction`; set `status:"done"`; add idempotency guard; return artifact.
- Modify: `src/app/api/studio-questions/route.ts` — response includes `artifact`;
  keep `{passageId, artifactId}` request contract (drop any need for title).
- Modify: `src/lib/study/shared/study-response-schema.ts` — response schema adds
  `artifact`.
- Read for context: `src/lib/study/passage/studio-artifacts-service.ts`
  (`toStudioArtifact` shape), `prisma/schema/studio.prisma`.

## Implementation Steps
1. In `generateQuestionsForPassage`, after validation, replace the standalone
   `db.question.createMany` with a `db.$transaction` that creates the artifact
   (`status:"done"`, title from passage) and the questions together.
2. Add idempotency: before inserting, `findUnique({ where: { id: artifactId } })`;
   if present and owned, return its mapped artifact + questions.
3. Change the return type to `{ artifact, questions }`; map the created row through
   the existing `toStudioArtifact` (or inline shape).
4. Update the route success response to `{ success: true, data: { artifact, questions } }`.
5. Update `study-response-schema.ts` to include `artifact` and keep questions.
6. `pnpm run typecheck` + `pnpm run lint`.

## Success Criteria
- [ ] A successful `POST` persists artifact(`done`) + questions atomically; no
      intermediate `generating` row ever exists in the DB.
- [ ] A failed/timed-out generation persists nothing (no partial rows).
- [ ] Re-`POST` with an existing `artifactId` returns the existing quiz, no dup.
- [ ] Response includes `artifact` + `questions`; schema validates.
- [ ] typecheck + lint clean.

## Risk Assessment
- **LLM inside txn would hold a DB connection 45s** → mitigation: LLM runs before
  the transaction; transaction is insert-only.
- **Serverless function timeout** must remain ≥ generation timeout — unchanged
  from today (LLM already ran in this request).
- **Idempotency race** (two near-simultaneous identical ids) → unique PK on
  `StudioArtifact.id` makes the second insert fail; catch and return existing.
