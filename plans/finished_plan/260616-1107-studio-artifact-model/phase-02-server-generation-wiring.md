---
phase: 2
title: "Server generation & wiring"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Server generation & wiring

## Overview

Thread `artifactId` from the client request through generation so each quiz's questions are
tagged with their artifact, stop the passage-wide delete (which enforced one-quiz-per-passage),
load detail by `artifactId`, and drop all `content` handling. This is the core fix that makes
"many artifacts per passage" actually work.

## Requirements

- Functional: generating a quiz writes questions with the request's `artifactId`; loading an
  artifact returns only that artifact's questions; no questions deleted on generate.
- Non-functional: `db.studioArtifact` accessor used everywhere; no `content` reads/writes remain.

## Architecture

Flow (client artifactId is authoritative — created in `handleActionClick`, Phase 3).
**Live path is the REST route**, not the server action — `study-generate-questions-action.ts` is
dead code (never imported) and gets **deleted** this phase.

```
client generateStudyQuestions({ passageId, artifactId })
  -> POST /api/study-questions { passageId, artifactId }   // route is the live path
  -> generateQuestionsForPassage(userId, passageId, artifactId)   // artifactId REQUIRED
       INSERT questions (createMany) WITH artifactId   // NO deleteMany({ passageId })
  -> detail: studyLoadStudioArtifactDetailAction(artifactId)
       SELECT questions WHERE artifactId = ?            // was: WHERE passageId
```

## Related Code Files

- Modify: `src/lib/study/passage/studio-artifacts-service.ts`
  - `db.studyArtifact` → `db.studioArtifact` (all sites).
  - Remove `completeStudioArtifact` `content` param + `data: { content }`; just set `status: "done"`.
  - Delete `loadStudioArtifactContent` (unused after content drop) and `StudioArtifactContent` usage.
- Modify: `src/lib/study/shared/studio-artifact-types.ts`
  - Remove `StudioArtifactContent` export. `StudioArtifactType = "quiz" | "flashcard"` (drop `chat`).
- Modify: `src/lib/study/passage/passage-study.service.ts`
  - `generateQuestionsForPassage(userId, passageId, artifactId)`: add **required** `artifactId` param;
    drop `deleteMany({ where: { passageId } })`; `createMany` data includes `artifactId`.
- Modify: `src/lib/db/passage-queries.ts`
  - `createQuestion` data type + `questionDataSchema`: add **required** `artifactId` (uuid).
- Modify: `src/app/api/study-questions/route.ts` (the live `/api/study-questions` handler)
  - Add `artifactId: z.string().uuid()` to `studyQuestionsPostSchema`; pass to `generateQuestionsForPassage`.
- Delete: `src/features/study/actions/study-generate-questions-action.ts`
  - Dead code (never imported; verified). Removing it avoids wiring a path nothing calls and keeps
    the required-`artifactId` contract clean. Confirm no import exists before deleting.
- Modify: `src/features/study/actions/study-artifact-actions.ts`
  - `studyLoadArtifactDetailAction`: query `where: { artifactId: input.artifactId }` instead of `passageId`.
  - `studyCompleteArtifactAction`: drop `content` param.
  - Remove `StudioArtifactContent` import.

## Implementation Steps

1. Update `studio-artifact-types.ts` (remove content type, trim type union).
2. Update `studio-artifacts-service.ts` accessor + complete/load functions.
3. Add required `artifactId` through `passage-queries.ts` schema + `passage-study.service.ts` (remove deleteMany, add artifactId to createMany).
4. Thread required `artifactId` through the `/api/study-questions` route schema + service call.
5. Delete `study-generate-questions-action.ts` (verify no imports first).
6. Fix `studyLoadArtifactDetailAction` to query by `artifactId`.
7. `pnpm run typecheck` — resolve all server-side errors.

## Success Criteria

- [ ] No `deleteMany({ where: { passageId } })` in the generate path.
- [ ] `questions.createMany` writes required `artifactId`.
- [ ] `studyLoadArtifactDetailAction` queries by `artifactId`.
- [ ] `study-generate-questions-action.ts` deleted; no dangling imports.
- [ ] No `content` / `StudioArtifactContent` references remain in server code.
- [ ] `pnpm run typecheck` + `pnpm run lint` clean for server files.

## Risk Assessment

- **Regen replacing old quiz:** removing `deleteMany` means old questions persist. Intended for
  many-per-passage. Confirm no UI assumed a single live set (issue-69 scope — flag, don't fix).
- **Route is the live path:** client hits `/api/study-questions` (REST); the server action is dead and
  deleted. Wire `artifactId` on the route + service only.
- **`getNewCards` / `quiz-review`** still query by `passageId` — leave as-is (passage-wide review pool).
