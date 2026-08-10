# Diagnosis: Background Failure Is Unrepresentable and Unrenderable

Date: 2026-08-10 · Branch: main · Status: analysis only, no code changed

## Scope

Axis 1 of the async-processing problem: **can the user find out what happened?**

Covers the render/state contract for work started in `after()` by:
- `POST /api/passage` (AI passage processing)
- `POST /api/artifact/question`
- `POST /api/artifact/flashcard`

Out of scope: whether the work reliably completes (`after()` vs Vercel Workflow, retry, durability). Tracked separately — see *Deferred* below.

## Summary

The domain has no vocabulary for failure. `ProcessingStatus` is `PENDING | COMPLETED` only, so a failed background job has exactly two possible representations, both wrong:

- leave the row `PENDING` → poll predicate never terminates → spinner forever
- delete the row → item vanishes with no explanation

Adding a `FAILED` row to the source list was tried and rejected: a failed row is an *event*, not *content*, and parking it in the content list is worse than the spinner.

The app already ships the correct surface for this — a dismissible alert strip above the source list, whose own doc comment names "AI processing" failures as its purpose. It has never been wired to background work.

Logging is not a fix. `log`/`Sentry` talk to the maintainer; the client learns state only by polling the DB. If `after()` writes no state the client can read, the client learns nothing regardless of log volume.

## Current state

### Status vocabulary

`prisma/schema.prisma:233`

```prisma
enum ProcessingStatus {
  PENDING    @map("pending")
  COMPLETED  @map("completed")
}
```

Applies to both `Passage.status` (`:101`) and `StudioArtifact.status` (`:119`).

### What each surface renders

| Surface | File | PENDING | COMPLETED | FAILED |
|---|---|---|---|---|
| Source list row | `src/features/passage/component/panel/source-list-item.tsx:37,67` | spinner, not clickable | normal row | no branch |
| Studio grid tile | `src/features/studio/component/panel/studio-panel.tsx:100` | spinner via `pendingTypes` | tile | no branch |
| Alert strip (passage) | `src/features/passage/component/panel/sources-panel.tsx:17` | — | — | exists, unused by background work |
| Alert strip (studio) | — | — | — | **does not exist** |

### Poll predicates

`src/features/passage/api/queries.ts:15` and `src/features/studio/api/queries.ts:25` both use:

```ts
refetchInterval: (query) =>
  (query.state.data ?? []).some((p) => p.status !== "COMPLETED") ? 2000 : false
```

`!== "COMPLETED"` — so any future non-`COMPLETED` terminal status keeps polling forever. This predicate must become `=== "PENDING"` before `FAILED` is introduced, or `FAILED` rows poll at 2s indefinitely.

### Existing alert surface (unused by background work)

`src/features/passage/component/panel/sources-panel.tsx:17`

```ts
/**
 * Workspace-level failures (create-passage, AI processing). Each renders
 * its own inline SourceErrorItem; the id keeps dismiss per-record.
 */
errors?: WorkspaceError[];
```

Fed only by `UploadModal.onClientError` → `useUploadFlow.addError`, i.e. synchronous request failures. `PassageErrorItem` (`passage-error-item.tsx`) is already fully generic: `title` / `error` / `onDismiss`, no passage coupling.

## Failure paths and resulting state

| # | Path | Evidence | Log fires? | Row ends as | User sees |
|---|---|---|---|---|---|
| 1 | Passage missing when generator runs | `artifact-generator.ts:75` — `if (!passage) return;` | no (no throw) | PENDING | spinner forever |
| 2 | Passage cleanup after AI failure | `app/api/passage/route.ts` calls `deletePassageForUser(passage.id, user.id)`; signature is `(userId, id)` — `passage-crud.ts:34` | yes, then catch itself throws P2025 | PENDING | spinner forever |
| 3 | Artifact cleanup after AI failure | `deleteArtifact(id, userId)` — argument order correct | yes | deleted | item vanishes silently |
| 4 | Invocation killed (timeout / deploy / OOM) | `passage-processing.ts:35` aborts at `200_000` ms; route sets `maxDuration = 200` — no margin | **no** — process stopped before `catch` | PENDING | spinner forever |
| 5 | Sentry queued inside `after()` | no `Sentry.flush()` in any `after()` block | partial — event may be dropped on instance freeze | n/a | n/a |

Paths 1–3 are provable from source. Paths 4–5 are mechanism-level risks; confirming they fire in practice needs runtime evidence.

Artifact routes have adequate margin (abort 45s vs `maxDuration = 60`); only the passage route has the 200/200 collision.

## Why logging cannot close this

`after()` runs after the response is flushed. Three consequences:

1. The response is already sent — the callback cannot alter it. Client holds `201`.
2. The only remaining channel to the user is the database, which the client polls. State not written = state not knowable.
3. If the instance dies, the callback dies with it: no `catch`, no `finally`, no log. Not reachable by any amount of instrumentation.

Point 3 means path 4 has no in-process remedy. It can be *masked* at the render layer (treat a `PENDING` row older than `maxDuration` as dead) or *solved* by durable execution. Masking leaves the DB row `PENDING` forever.

## Design direction

Keep `FAILED` in the database; keep it out of the content list.

```
after() catch  →  status = FAILED
                        │
client poll ────────────┤
                        ├─ PENDING / COMPLETED → list row
                        └─ FAILED              → alert strip
                                                     │
                                              dismiss → DELETE
```

Dismiss is a real `DELETE`, not a hide. A failed row lives exactly as long as its notice; one click removes it permanently. Preserves the current "gets deleted" behaviour, but moves the deletion to after the user has been told why.

## Files in scope

| File | Role | Change |
|---|---|---|
| `prisma/schema.prisma:233` | status vocabulary | add `FAILED` + migration |
| `src/features/passage/api/queries.ts:15` | poll predicate | `!== COMPLETED` → `=== PENDING` |
| `src/features/studio/api/queries.ts:25` | poll predicate | same |
| `src/app/api/passage/route.ts` | `after()` catch | write `FAILED` instead of delete; fix swapped delete args; widen abort/`maxDuration` margin |
| `src/app/api/artifact/question/route.ts` | `after()` catch | write `FAILED` instead of delete |
| `src/app/api/artifact/flashcard/route.ts` | `after()` catch | same |
| `src/features/studio/server/service/artifact-generator.ts:75` | silent `return` | throw so the catch can record it |
| `src/features/passage/server/service/passage-processing.ts:35` | abort budget | abort must land before `maxDuration` |
| `src/features/passage/component/panel/passage-error-item.tsx` | alert item | promote to shared component (already generic) |
| `src/features/passage/component/panel/sources-panel.tsx` | passage list | partition `FAILED` out of rows into the strip |
| `src/features/passage/hook/use-upload-flow.ts` | error store | merge server-derived `FAILED` with client-side errors |
| `src/features/studio/component/panel/studio-panel.tsx` | studio panel | **new** alert surface (none today) |

Only new UI required: the studio-side alert strip.

## Deferred

- `after()` → Vercel Workflow. Orthogonal (axis 2: does the work complete). CLAUDE.md already names Workflow as the target for AI pipelines, so current code is off its own stated architecture. Sequenced after this work because failure frequency is currently unmeasurable — once `FAILED` is recorded, the decision can rest on observed rates and causes rather than assumption. If failures turn out to be AI-schema violations rather than timeouts, Workflow retry buys little.
- Retry button. Cheap once `FAILED` exists — `content` is already persisted at row creation, so the pipeline can re-run without re-upload.

## Open questions

1. Dismiss semantics: manual `X` → `DELETE` (survives reload, guarantees the user sees it), or auto-delete on first render (notice lives only in client memory, reload clears it)?
2. Store an `errorMessage` column? Distinguishes "retry may help" from "this content will never process"; without it the strip shows a generic line and detail lives in Sentry only.
3. Mask path 4 with a client-side staleness rule now, or leave those rows spinning until Workflow lands?
4. Path 4 and 5 unconfirmed at runtime — worth reproducing before sizing the fix?
