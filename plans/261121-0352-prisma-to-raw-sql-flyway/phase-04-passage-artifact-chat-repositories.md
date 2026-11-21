---
phase: 4
title: "Phase 4: Passage, artifact and chat repositories"
status: todo
priority: P1
effort: "4h"
dependencies: [2]
---

# Phase 4: Passage, artifact and chat repositories

## Overview

Rewrite the three existing repositories in raw SQL. Make them pure query code:
they return rows, `null` or a boolean, and never throw `AppError`. The not-found
decisions move into the services. Switch every import of the generated enums to
`@/shared/enums`.

## Context Links

- `src/server/modules/passage/passage-repository.ts`, `passage-service.ts`, `passage-routes.ts`, `ingestion/generate.ts`, `workflow/steps.ts`
- `src/server/modules/artifact/artifact-repository.ts`, `artifact-service.ts`, `artifact-routes.ts`, `artifact-generator.ts`, `workflow/steps.ts`
- `src/server/modules/chat/chat-repository.ts`, `chat-service.ts`
- `src/shared/passage/schema.ts` (`Passage`, `PassageListItem`) and `src/shared/studio/artifact.ts` (the row shapes to return)

## Requirements

- [ ] Each repository function keeps its current name, arguments and result shape. The exceptions are listed in the next item.
- [ ] Not-found handling changes in these places:
  - `deletePassageForUser` returns `boolean`. A new service function throws `passage.not_found` when it is false. The route imports it from the service, which replaces today's re-export.
  - `completePassageProcessing` and `failPassageProcessing` return `Passage | null`. Callers throw `passage.not_found` on `null`, so a passage deleted during processing still fails the workflow step, as Prisma's `P2025` did.
  - `getArtifact` in the repository becomes `findArtifactForUser`, returning the artifact or `null`. `artifact-service.ts` gets `getArtifact(id, userId)`, which throws `artifact.not_found`. The service functions use it.
  - `deleteArtifact` returns `boolean`, and the service throws `artifact.not_found` when it is false.
  - `updateArtifactStatus` and `updateArtifactProgress` return the row or `null`. Callers throw `artifact.not_found` on `null`.
- [ ] `updateArtifactStatus` with no `content` keeps the stored content (`"content" = COALESCE($3::jsonb, "content")`), the same as Prisma's `undefined`.
- [ ] `createArtifact` with no `status` uses `'COMPLETED'`. With no `content`, it stores SQL `NULL`.
- [ ] Chat history is `ORDER BY "createdAt" ASC, "id" ASC LIMIT 40`. That keeps today's behavior: the first 40 messages, not the latest.
- [ ] No file imports `@/server/db/generated/*`. The importers today are `artifact-repository.ts`, `artifact-service.ts`, `artifact-routes.ts`, `artifact-generator.ts`, `artifact/workflow/steps.ts` and `passage-repository.ts`.

## Files

- Modify: `src/server/modules/passage/passage-repository.ts`
- Modify: `src/server/modules/passage/passage-service.ts`
- Modify: `src/server/modules/passage/passage-routes.ts`
- Modify: `src/server/modules/passage/ingestion/generate.ts`
- Modify: `src/server/modules/passage/workflow/steps.ts`
- Modify: `src/server/modules/artifact/artifact-repository.ts`
- Modify: `src/server/modules/artifact/artifact-service.ts`
- Modify: `src/server/modules/artifact/artifact-routes.ts`
- Modify: `src/server/modules/artifact/artifact-generator.ts`
- Modify: `src/server/modules/artifact/workflow/steps.ts`
- Modify: `src/server/modules/chat/chat-repository.ts`
- Create: `src/server/modules/passage/passage-repository.test.ts`
- Create: `src/server/modules/artifact/artifact-repository.test.ts`
- Create: `src/server/modules/chat/chat-repository.test.ts`

## Implementation Steps

1. For each repository function, write one parameterized statement with an explicit column list. Use `RETURNING <columns>` on writes and `$n` placeholders, never string interpolation of values. Put the ownership condition in the same `WHERE`, for example `WHERE "id" = $1 AND "userId" = $2`.
2. `completePassageProcessing` keeps computing `wordCount` in TypeScript, as it does now.
3. Move the not-found decisions into the services and callers as listed above. Then remove `AppError` from the repository imports.
4. Replace the generated-enum imports with `@/shared/enums`. The shared module exports the same const objects and types.
5. Write the tests. Use `createTestUser()`, call `deleteTestUsers()` in `afterEach`, and filter every assertion by the test's own user ids:
   - **Passage:** create sets `PENDING` and a null `filePath`. Complete sets `COMPLETED`, the `wordCount` and the CEFR level. List returns newest first and only the owner's rows. Find by another user returns `null`. Delete by another user returns `false` and leaves the row.
   - **Artifact:** create without content stores null content. A status update without content keeps it. Progress round-trips both an object and an array as `jsonb`. Find by another user returns `null`. List is ordered by `createdAt` descending.
   - **Chat:** the history order is stable for equal `createdAt` values (tie broken by `id`). The limit is 40. Delete removes only that user's rows for that passage.

## Todo

- [ ] Passage repository and service
- [ ] Artifact repository and service
- [ ] Chat repository
- [ ] Generated-enum imports removed
- [ ] Repository tests

## Success Criteria

- `pnpm test src/server/modules/passage src/server/modules/artifact src/server/modules/chat` passes.
- `grep -rn "db/generated" src` finds nothing outside `src/server/db/generated` itself.
- `grep -rln "AppError" src/server/modules/*/*-repository.ts` finds nothing.
- `pnpm typecheck` and `pnpm lint` are green.
