---
title: "background failure visibility"
description: "Record background-job failure as a terminal FAILED status the client can read and render"
status: pending
priority: P1
effort: "3h"
tags: [error-handling, async, ui-state]
created: 2026-08-10
---

# background failure visibility

## Overview

Background work started in `after()` has no way to report failure. `ProcessingStatus` gained
`FAILED` (schema + generated client already updated), but nothing writes it, nothing stops
polling on it, and nothing renders it.

Pattern chosen: **entity carries a `status` column; the worker writes the terminal state;
the client reads that column.** No derived state, no staleness computation, no retry, no new
UI surface. Prior design directions (alert strip, derive-on-read staleness) were evaluated
and rejected — see [diagnosis report](../reports/diagnosis-260810-2208-background-failure-visibility.md)
and the *Rejected* section below.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | A failed background job leaves a row the user can see and delete — never a permanent spinner, never a silent disappearance | P1 |
| 2 | Polling terminates on every terminal status, not just `COMPLETED` | P1 |
| 3 | AI timeouts land in the `catch` block instead of being killed by the platform | P2 |

## Ordering constraint (reader before writer)

Phase 1 must ship before Phase 2. Phase 1 alone is a no-op — nothing produces `FAILED` yet.
Phase 2 alone would produce rows that poll every 2s forever and render as an infinite spinner.

```
Phase 1 (client tolerates FAILED)  →  Phase 2 (server writes FAILED)  →  Phase 3 (timeout budget)
```

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Client tolerates FAILED](./phase-01-client-tolerates-failed.md) | Pending |
| 2 | [Phase 2: Server writes FAILED](./phase-02-server-writes-failed.md) | Pending |
| 3 | [Phase 3: Timeout hardening](./phase-03-timeout-hardening.md) | Pending |

## Boundary — every file this plan touches

| File | Phase | Change |
|------|-------|--------|
| `src/features/passage/api/queries.ts` | 1 | poll predicate `!== "COMPLETED"` → `=== "PENDING"` |
| `src/features/studio/api/queries.ts` | 1 | same |
| `src/features/passage/component/panel/source-list-item.tsx` | 1 | third render branch for `FAILED` |
| `src/features/studio/component/panel/artifact-list-item.tsx` | 1 | status union gains `"failed"` + render branch |
| `src/features/studio/component/panel/default-studio-view.tsx` | 1 | `mapProcessingStatus` gains explicit `FAILED` case |
| `src/features/passage/server/service/passage-crud.ts` | 2 | add `failPassageProcessing`; `deletePassageForUser` left untouched |
| `src/app/api/passage/route.ts` | 2 | catch writes `FAILED`; drop the `deletePassageForUser` call |
| `src/app/api/artifact/question/route.ts` | 2 | catch writes `FAILED`; drop the `deleteArtifact` call |
| `src/app/api/artifact/flashcard/route.ts` | 2 | same |
| `src/features/studio/server/service/artifact-generator.ts` | 3 | silent `return` → `throw` |
| `src/features/passage/server/service/passage-processing.ts` | 3 | abort budget below `maxDuration` |

**Explicitly not touched** — if a diff shows these, scope has drifted:

- `prisma/schema.prisma` — `FAILED` already present (`:236`, `@map("failed")`)
- `src/features/passage/schema.ts`, `src/features/studio/schema/artifact.ts` — both already
  `z.enum(ProcessingStatus)`, so `FAILED` validates with no edit
- `src/features/passage/hook/use-passage-library.ts` — all four gates already use positive
  `=== "COMPLETED"` checks; `FAILED` is excluded for free
- `src/features/passage/hook/use-upload-flow.ts`, `sources-panel.tsx`, `passage-error-item.tsx`
  — the alert strip keeps its existing role (pre-entity failures only)
- `src/app/api/artifact/[id]/route.ts` and all delete mutations — delete already works
- `src/features/studio/server/service/artifact-crud.ts` — `updateArtifactStatus` is reused as-is

## Precondition (blocking, verify before Phase 2)

There is no `prisma/migrations/` directory — this repo runs `prisma generate` only, so
regenerating the client did **not** alter the Postgres enum type. Writing `FAILED` against a
database whose enum lacks the value fails at runtime with
`invalid input value for enum "ProcessingStatus"`.

Verify the DB has the value (note the `@map` — the stored label is lowercase `failed`):

```sql
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
WHERE pg_type.typname = 'ProcessingStatus';
```

If `failed` is absent, push the schema before Phase 2. Phase 1 is unaffected.

## Rejected

| Option | Why not |
|--------|---------|
| `FAILED` row moved to a dismissible alert strip | Needs a brand-new alert surface in studio (none exists) plus a merge of server query state into `useUploadFlow`'s `useState`. Strictly more code than a render branch, and it adds a second source of truth. |
| Derive `FAILED` from `PENDING` + row age at read time | DB never records the failure; the derive lives only in the list service, so list would show `FAILED` while detail still showed `PENDING`. Hand-rolls a queue's visibility-timeout in the read path. |
| `dismiss → DELETE` on the notice | Conflates "hide this message" with "destroy the record". The existing `Xóa nguồn` / `Xóa artifact` dropdown item is already the delete action. |
| Add `PROCESSING` status | `after()` starts immediately; user cannot distinguish queued from running. YAGNI. |
| Add `errorMessage` / `failureReason` column | UI shows only "failed"; the reason already goes to `log.error` + Sentry. Add when failure rates are measurable. |
| Retry button | Explicitly declined. Recovery path is delete + re-upload; UI copy must say so. |

## Known gap (accepted, not fixed here)

A hard platform kill — OOM or a deploy cutting the invocation — runs no `catch`, so the row
stays `PENDING` and spins forever. No application-level fix exists; real systems solve it with
a queue lease/heartbeat. Phase 3 shrinks this to OOM/deploy only by making AI timeouts
catchable. Full closure arrives with the deferred Vercel Workflow migration, which CLAUDE.md
already names as the target for AI pipelines and which will write the same `status` column.

## Success Criteria

- [ ] A background job that throws leaves its row at `status = FAILED` in the database
- [ ] No row is deleted by a `catch` block — a failed item stays visible until the user deletes it
- [ ] List polling stops once every row is `COMPLETED` or `FAILED` (verify: no `/api/passage`
      request after 2s in the network panel)
- [ ] A `FAILED` passage row and a `FAILED` artifact tile each render a distinct failed state —
      not a spinner, not a normal row
- [ ] A `FAILED` row is not clickable and never triggers a detail fetch
- [ ] `pnpm typecheck` and `pnpm lint` pass

## Open questions

None. Retry, `failureReason`, and staleness detection were all decided against; the platform-kill
gap is accepted and documented above.

<!-- slug: background-failure-visibility -->
