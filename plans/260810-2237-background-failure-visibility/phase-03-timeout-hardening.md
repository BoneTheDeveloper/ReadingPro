---
title: "Phase 3: Timeout hardening"
status: todo
---

# Phase 3: Timeout hardening

## Overview

Two one-line changes that decide whether the Phase 2 `catch` ever gets a chance to run.
Independent of Phases 1-2 in mechanics, but pointless before them.

## Requirements

- [ ] The AI call gives up before the platform kills the invocation
- [ ] No code path returns silently from a failed generation

## Architecture

**Timeout budget hierarchy.** The inner client timeout must always be strictly shorter than
the outer platform timeout. Otherwise the platform wins the race, the process is killed
mid-flight, and no `catch`, `finally`, or log ever runs — the row is stranded at `PENDING`
with no application-level remedy.

| Path | AI abort | `maxDuration` | Margin |
|------|----------|---------------|--------|
| passage | `200_000` ms (`passage-processing.ts:35`) | `200` s (`api/passage/route.ts:19`) | **none — collision** |
| artifact question | `45_000` ms (`artifact-generator.ts:40`) | `60` s (`question/route.ts:15`) | 15 s, fine |
| artifact flashcard | `45_000` ms (`artifact-generator.ts:54`) | `60` s (`flashcard/route.ts:14`) | 15 s, fine |

Only the passage path needs fixing. Lowering its abort converts the most common timeout
failure from an unhandleable platform kill into an ordinary caught exception. This is the
cheap 80% of the platform-kill gap; what remains after it is OOM and deploy interruption,
which stay accepted (see `plan.md` → *Known gap*).

**Silent return.** `artifact-generator.ts:75` reads `if (!passage) return;` — it resolves
successfully when the passage is missing, so the caller's `catch` never fires and the artifact
sits at `PENDING` forever. It must throw for Phase 2's handler to record anything.

## Related Code Files

- Modify: `src/features/passage/server/service/passage-processing.ts`
- Modify: `src/features/studio/server/service/artifact-generator.ts`
- Read-only reference: `src/app/api/passage/route.ts` (`maxDuration = 200`, unchanged)

## Implementation Steps

1. `passage-processing.ts:35` — `AbortSignal.timeout(200_000)` → `AbortSignal.timeout(170_000)`.
   Leave `maxDuration = 200` alone. Add a comment tying the two numbers together so a future
   edit to either one is visibly load-bearing: the abort exists to let the catch run, so it
   must stay under `maxDuration`.
2. `artifact-generator.ts:75` — `if (!passage) return;` → throw `NotFoundError`
   (`src/lib/error/app-error.ts:53`) rather than a bare `Error`. CLAUDE.md's error contract is
   that services throw `AppError`; a missing passage is exactly the not-found case.
3. Confirm no other `after()`-reachable service returns silently on a missing precondition:
   `grep -rn "if (!.*) return;" src/features/*/server/service/`.

## Todo

- [ ] Passage abort budget
- [ ] `artifact-generator` throws on missing passage
- [ ] Grep for other silent returns in service layer
- [ ] `pnpm typecheck && pnpm lint`

## Success Criteria

- [ ] Passage AI abort is strictly less than `maxDuration`, with the relationship documented
      in a comment
- [ ] Deleting a passage between artifact creation and generation leaves the artifact at
      `status = FAILED`, not `PENDING`
- [ ] `pnpm typecheck` and `pnpm lint` pass

## Risk Assessment

- **A legitimate slow passage now aborts at 170s where it previously had 200s.** Real cost is
  30 s of headroom on an already-extreme case; the alternative is that those runs are killed
  by the platform and stranded at `PENDING` regardless. Net improvement either way.
- **Throwing on a missing passage changes a previously silent path into a logged error.**
  Intended — that path was invisible, which is the bug. Expect Sentry volume to rise slightly
  and treat it as the first real measurement of failure rate.
