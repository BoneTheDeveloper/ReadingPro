---
title: "Phase 2: Server writes FAILED"
status: todo
---

# Phase 2: Server writes FAILED

## Overview

Replace "delete the row on failure" with "mark the row `FAILED`". This is the whole pattern:
the worker owns the terminal state, the client reads it. Depends on Phase 1 — merging this
first produces rows that poll forever and spin forever.

**Blocked by the DB precondition in `plan.md`.** Confirm the Postgres enum carries the
lowercase `failed` label before merging; the generated Prisma client alone does not alter it.

## Requirements

- [ ] Every `catch` inside `after()` writes `status = FAILED`
- [ ] No `catch` deletes a row
- [ ] Failure logging (`log.error` + `Sentry.captureException`) stays exactly as it is
- [ ] The user's uploaded content survives the failure — the row still holds it

## Architecture

Two of the three routes currently delete on failure, and they behave differently:

| Route | Current call | Actual behaviour |
|-------|-------------|------------------|
| `api/passage` | `deletePassageForUser(passage.id, user.id)` | **arguments swapped** — the signature is `(userId, id)` (`passage-crud.ts:34`), so this throws P2025 and the row survives as `PENDING` by accident |
| `api/artifact/question` | `deleteArtifact(artifact.id, user.id)` | signature is `(id, userId)` — correct order, so the row really is deleted and the tile vanishes silently |
| `api/artifact/flashcard` | same | same |

Both calls disappear in this phase, so the swapped-argument bug is removed by deletion rather
than by fixing the argument order. `deletePassageForUser` itself is not modified — it is still
used correctly by the user-facing delete mutation.

Artifacts reuse `updateArtifactStatus` (`artifact-crud.ts:57`) unchanged; it already accepts
`{ id, userId, status }` with optional content. Passages need a new function:
`completePassageProcessing` (`passage-crud.ts:66`) cannot be reused because it requires
`content`, `title`, and `cefrLevel` — none of which exist when processing fails.

## Related Code Files

- Modify: `src/features/passage/server/service/passage-crud.ts` — add `failPassageProcessing`
- Modify: `src/app/api/passage/route.ts`
- Modify: `src/app/api/artifact/question/route.ts`
- Modify: `src/app/api/artifact/flashcard/route.ts`
- Reuse unchanged: `src/features/studio/server/service/artifact-crud.ts` (`updateArtifactStatus`)

## Implementation Steps

1. `passage-crud.ts` — add next to `completePassageProcessing`, matching its
   `where: { id, userId }` ownership scoping:

   ```ts
   export async function failPassageProcessing(args: {
     userId: string;
     passageId: string;
   }): Promise<Passage> {
     return prisma.passage.update({
       where: { id: args.passageId, userId: args.userId },
       data: { status: "FAILED" },
     });
   }
   ```

   Argument order follows `completePassageProcessing`'s named-object shape, which is what made
   the positional `deletePassageForUser` call swappable in the first place.

2. `src/app/api/passage/route.ts` — in the `after()` catch, replace
   `await deletePassageForUser(passage.id, user.id)` with
   `await failPassageProcessing({ userId: user.id, passageId: passage.id })`.
   Update the import. Keep `log.error` and `Sentry.captureException` above it untouched.

3. `src/app/api/artifact/question/route.ts:44` — replace
   `await deleteArtifact(artifact.id, user.id)` with
   `await updateArtifactStatus({ id: artifact.id, userId: user.id, status: "FAILED" })`.
   Update the import.

4. `src/app/api/artifact/flashcard/route.ts:43` — same change.

5. Verify no `catch` inside an `after()` block still calls a delete:
   `grep -rn "after(" -A15 src/app/api | grep -i delete` must return nothing.

## Todo

- [ ] `failPassageProcessing` in `passage-crud.ts`
- [ ] Passage route catch
- [ ] Question route catch
- [ ] Flashcard route catch
- [ ] Grep check for surviving deletes in `after()` blocks
- [ ] `pnpm typecheck && pnpm lint`

## Success Criteria

- [ ] Forcing a throw inside `runPassageProcessing` leaves the passage at `status = FAILED`
      with its `content` intact
- [ ] Forcing a throw inside `generateAndStoreArtifact` leaves the artifact at
      `status = FAILED` — the row is not deleted
- [ ] The failed row surfaces in the UI as the Phase 1 failed state within one poll interval
- [ ] Sentry still receives the exception
- [ ] `pnpm typecheck` and `pnpm lint` pass

## Risk Assessment

- **DB enum missing the `failed` label.** The write throws inside `after()`, after the response
  is flushed, so it fails invisibly and the row stays `PENDING`. Mitigation: the blocking
  precondition check in `plan.md`; confirm before merge, not after.
- **A failure whose cause is the passage row already being gone.** The `update` then throws
  P2025 inside the catch. Acceptable — the row is deleted either way, so there is nothing to
  render; the original error is already logged before this line.
