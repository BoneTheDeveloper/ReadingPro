---
title: Server-side ProcessingStatus vs client-state — ctx7 verification
type: research
date: 2026-08-02
---

# Research: client-state vs server-status for async job tracking

## Decision being verified

`260802-2128-async-status-tracking` — move async processing state from
`useArtifactPending` / `useUploadFlow` (client memory) to a `ProcessingStatus`
enum column on `Passage` and `StudioArtifact`, polled by TanStack via
`refetchInterval`. AI runs in `next/server` `after()` so the route returns
immediately with `status: PENDING`.

## Method

ctx7 docs lookup for the four claims the plan depends on:

1. `after()` runs after the response is sent.
2. `after()` runs on the server, independent of client navigation.
3. `useMutationState` does **not** survive a full page reload.
4. `refetchInterval: (query) => …` returning `false` is the documented
   conditional-polling pattern.

## Findings

| # | Claim | Source | Result |
|---|-------|--------|--------|
| 1 | `after()` executes "after the response or prerender is finished" | `/websites/nextjs` — `app/api-reference/functions/after.md` | **Confirmed.** Non-blocking side effects. |
| 2 | `after()` runs on server, independent of client | same as above — explicitly documented | **Confirmed.** Survives route refresh because the DB row is the source of truth. |
| 3 | `useMutationState` persists across reloads | `/websites/tanstack_query_v5` — `reference/useMutationState.md` | **Refuted.** Reads the in-memory mutation cache; cleared on full page reload (the original bug). |
| 4 | `refetchInterval` accepts a function that returns `false` to stop | `/websites/tanstack_query_v5` — `framework/react/guides/polling.md` | **Confirmed.** Returns `2_000` while non-terminal, `false` once `status === 'complete'`. |
| 5 | Errors inside `after()` do not propagate to the route handler | `/websites/nextjs` — `after.md` "executes regardless of whether the response completed successfully" | **Confirmed.** This is the reason `runPassageProcessing` must wrap the AI call in try/catch and write `status: FAILED, statusError` itself. |

## Verdict

The server-status architecture is the correct choice. Client-state
alternatives (the current `useArtifactPending` and async parts of
`useUploadFlow`) are the source of the bug. The plan's Phase 1 implementation
matches the documented patterns exactly:

- `after(async () => runPassageProcessing(passageId))` before
  `return Response.json(passage, { status: 201 })` — non-blocking.
- `refetchInterval: (q) => q.state.data?.status === 'COMPLETED' || q.state.data?.status === 'FAILED' ? false : 2000` — exact pattern from TanStack docs.
- `runPassageProcessing` wraps the AI call in try/catch — required because
  `after()` swallows errors into its own scope.

## Implications for the implementation

- Phase 1 in `260802-2128-async-status-tracking/phase-01-schema-passage-async.md` is sound; resume the schema change.
- The Zod schema must NOT include `status` or `statusError` in any input schema — the error-status invariant relies on this. (Already in the plan.)
- Migration backfill is required: existing rows have no status; default would otherwise mark them all as still processing. Backfill to `COMPLETED` in same migration.

## Unresolved questions

None — verification complete.