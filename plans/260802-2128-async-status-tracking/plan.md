---
title: "Async Status Tracking"
description: "Move async processing status from client-side memory (lost on refresh) to server-side schema fields with React Query polling. Eliminates useArtifactPending and useUploadFlow's async tracking."
status: pending
priority: P1
effort: "1.75d"
tags: [refactor, async, react-query, prisma]
created: 2026-08-02
---

# Async Status Tracking

## Overview

Today, async work (passage AI processing, question generation) is tracked in client-side memory only — `useUploadFlow` uses `useState` and `useArtifactPending` reads TanStack mutation cache. Both are lost on route refresh, leaving the user with no way to follow in-flight work and no signal on success/failure.

Move the source of truth to the database: add a `ProcessingStatus` enum and `status` fields to `Passage` and `StudioArtifact`. Route handlers return immediately with `status: PENDING`, AI runs in `after()`/background, status flips to `COMPLETED`/`FAILED`. Client polls with `useQuery` `refetchInterval`.

This plan supersedes `260801-2109-artifact-pending-state` (which introduced the mutation-state approach).

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Async processing state survives page refresh and route changes | P1 |
| 2 | Failed processing is visible in the UI with a clear error message | P1 |
| 3 | Remove client-side tracking hooks (`useArtifactPending`, async parts of `useUploadFlow`) | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Schema + Passage async](./phase-01-schema-passage-async.md) | Pending |
| 2 | [Phase 2: StudioArtifact async](./phase-02-artifact-async-status.md) | Pending |
| 3 | [Phase 3: Upload flow refactor](./phase-03-upload-flow-refactor.md) | Pending |
| 4 | [Phase 4: Stuck-state cleanup](./phase-04-stuck-state-cleanup.md) | Pending |

## Architecture

### Before (current)
```
User uploads → POST /api/passage (BLOCKING, AI runs synchronously)
            → response with completed Passage
            → useUploadFlow tracks string-based pending state in React

User generates → POST /api/artifact/question (BLOCKING)
              → useArtifactPending reads useMutationState
              → lost on refresh
```

### After
```
User uploads → POST /api/passage creates row with status=PENDING, returns immediately
            → AI runs in after() callback
            → updates status to COMPLETED/FAILED
            → usePassage query polls via refetchInterval while status !== terminal

User generates → POST /api/artifact/question creates row with status=PENDING
              → AI runs in after()
              → useArtifactList query polls
              → ArtifactListItem renders based on artifact.status (already supports)
```

### Shared enum
```prisma
enum ProcessingStatus {
  PENDING    @map("pending")
  COMPLETED  @map("completed")
  FAILED     @map("failed")
}
```

Three states (not five): `PENDING` covers both "row just created" and "AI running" — the client doesn't need to distinguish. Per `prisma` docs, enums are the right choice for type-safe, finite sets — matches existing convention (`VocabularyStatus`, `StudioArtifactType`).

## Success Criteria

- [ ] All async processing state lives in the database
- [ ] Refreshing the page mid-generation preserves the "processing" UI
- [ ] Failed passages/artifacts render with error message (no retry; user deletes via existing DELETE route)
- [ ] `useArtifactPending` hook deleted
- [ ] `useUploadFlow` collapsed to modal state only
- [ ] TypeScript, lint, knip pass

## Cleanup Resolution

MVP cleanup is **two layers**, both shipping in Phases 1–4:

| Layer | Target | Trigger | Action | Latency |
|-------|--------|---------|--------|---------|
| **1. User delete** | PENDING + FAILED | User clicks delete | Existing `DELETE /api/[entity]/[id]` removes the row | instant |
| **2. User re-trigger** | FAILED artifact | User clicks "Generate" on a failed artifact | Existing POST creates a fresh PENDING row | instant |

That's it. No cron. No retention threshold. The MVP trusts that:
- PENDING rows are rare (server crash wastes one row).
- FAILED rows are noise the user clears manually.
- A future plan can add cron cleanup if production data shows accumulation.

## Error-Status Invariant

> **Only the processing step can write `status: FAILED` or `statusError`.**

MVP enforcement: Zod schemas (`passageUpdateSchema`, `artifactUpdateSchema`) do not include `status` or `statusError` — clients cannot PATCH them. That single rule covers the only realistic entry point (HTTP requests). Direct DB writes from server code are reviewed normally.

If a future feature needs auto-recovery (e.g. "retry with reduced input"), it creates a new row, not patch the failed one — the schema enforces this naturally.

## Out of Scope

- Retry orchestration — user re-clicks "Generate" tile for failed artifacts; existing DELETE handles cleanup
- Cron cleanup of FAILED rows — non-trivial; ship when production data shows accumulation
- Cron cleanup of PENDING rows — kept as live signal; user delete only
- Service-level `updateXStatus` guard — Zod rejection at the API boundary is sufficient for MVP
- Progress percentages (`PENDING` is binary for now; can be added later if needed)
- Real-time push (SSE/WebSocket) — polling at 2s is sufficient for AI jobs ~5-10s
- Cross-tab synchronization — accept the simpler per-tab poll

## Validation Log

### Session 1 — 2026-08-02
**Trigger:** User requested validation of phase 2 to ensure implementation correctness.
**Tier:** Standard (3 phases)
**Questions asked:** 3

#### Verification Results
- **Tier:** Standard
- **Claims checked:** 10 (focused on phase 2)
- **Verified:** 8 | **Failed:** 2 | **Unverified:** 0

#### Failures surfaced
1. **[Fact Checker]** `ArtifactListItem` does not have an `onRetry` prop. Plan's UI code assumed it would.
2. **[Fact Checker]** `next/server`'s `after()` is not used anywhere in the codebase — new pattern to introduce.

#### Questions & Answers
1. **[Retry UX]** How to handle missing `onRetry` on `ArtifactListItem`?
   - Options: Add onRetry prop / Use different surface / Native prompt
   - **Answer:** "no retry, keep current pending and error"
2. **[Async runtime]** Which async mechanism?
   - Options: Use `after()` (Recommended) / Fire-and-forget Promise / Vercel Workflow
   - **Answer:** Use `after()` — verify Next.js version first (Recommended)
3. **[Retry endpoint]** Reuse POST or dedicated retry route?
   - Options: Reuse POST (Recommended) / Dedicated `/retry`
   - **Answer:** "we said no retry just,we need a way to clean its up so the error and pending dont stuck in the"

#### Confirmed Decisions
- **No retry on either artifacts or passages** — drop `onRetry` from `ArtifactListItem`; failed rows just show error. User re-clicks "Generate" for artifacts or deletes+re-uploads for passages.
- **`after()` from `next/server`** — verified available in Next.js 16.2.9 docs; 16.2.12 in project has it. Bounded by route's `maxDuration` (default 30s is sufficient for AI calls).
- **Cleanup path** — manual via existing `DELETE /api/artifact/[id]` and `DELETE /api/passage/[id]`. Cron cleanup deferred.

#### Action Items
- [x] Drop `onRetry` from phase 2 UI code
- [x] Drop `useRetryArtifact` from phase 2 mutations
- [x] Drop `useRetryPassage` + `/retry` endpoint from phase 3
- [x] Update plan.md goal #2 (retryable → visible error)
- [x] Update plan.md Out of Scope (retry → cleanup)
- [x] Add stuck-row cleanup notes (deferred to future plan)

#### Impact on Phases
- **Phase 2:** Removed retry UX and `useRetryArtifact`. Added manual-delete cleanup note.
- **Phase 3:** Removed retry UX and `useRetryPassage` + `/retry` route. FAILED rows show error, deletable via existing flow.
- **Plan:** Goal #2 changed from "retryable UX" to "clear error UX". Out of Scope now lists "cleanup" instead of "retry".

### Whole-Plan Consistency Sweep
- Files reread: `plan.md`, `phase-01-schema-passage-async.md`, `phase-02-artifact-async-status.md`, `phase-03-upload-flow-refactor.md`
- Decision deltas checked: 3 (no retry, use after(), manual cleanup)
- Reconciled stale references: 6 (retry prop, retry hook, retry route, retry button, retry test, plan.md goal/out-of-scope)
- Unresolved contradictions: 0

### Session 2 — 2026-08-02 (Stuck-state cleanup clarification)
**Trigger:** User asked to clarify how unresolved PENDING/FAILED rows get resolved; cleanup must be explicit in the plan.
**Tier:** Targeted clarification — focused only on cleanup mechanics + invariant enforcement.

#### Decisions Captured
1. **FAILED cleanup is FAST.** Threshold lowered from "7 days" → **1 hour**. Failed rows are noise — user has seen the error, re-trigger is a fresh row. Keep the table small.
2. **PENDING cleanup is OPTIONAL/DEFERRED.** No cron for PENDINGs. A pending row is a legitimate signal. User delete is the only path. Stale PENDINGs cost less than false-negative "AI failed" warnings.
3. **Error-status invariant:** Only the processing step can write `status: FAILED` or `statusError`. Enforced by Zod schemas (clients cannot PATCH status) + service-level guard (`FAILED requires statusError`) + non-barrel export of `updateXStatus()`.

#### Context7 Sources
- `after()` error isolation: [/vercel/next.js/v16.2.9 — after-context.ts](https://github.com/vercel/next.js/blob/canary/packages/next/src/server/after/after-context.ts) — confirmed no built-in retry.
- Vercel cron auth: [/websites/vercel — cron-jobs/manage-cron-jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — `CRON_SECRET` + Bearer pattern.
- Vercel cron schedule: [/websites/vercel — cron-jobs/quickstart](https://vercel.com/docs/cron-jobs/quickstart) — `vercel.json` `crons` array.
- TanStack polling: [/tanstack/query docs/framework/react/guides/polling.md](https://github.com/tanstack/query/blob/main/docs/framework/react/guides/polling.md) — `refetchInterval: (query) => ...` returning false stops polling.
- Prisma bulk delete: [/prisma/prisma — deleteMany idempotency](https://github.com/prisma/prisma/blob/main/packages/client/tests/functional/optimistic-concurrency-control/tests.ts) — concurrent calls safe.

#### Impact on Plan
- **Phase 4 added as new phase** (was inline in plan.md "Out of Scope" before). Includes the error-status invariant as a first-class requirement.
- **plan.md Cleanup Resolution table** rewritten: now 3 layers, FAILED > 1h, PENDING not cleaned by cron.
- **plan.md Error-Status Invariant section** added — documents the "only processing step writes FAILED" rule.
- **plan.md Out of Scope** updated: removed "Stuck-row cron cleanup" (now in Phase 4), added "Cron cleanup for PENDING rows" + "Cron cleanup implementation".

### Session 3 — 2026-08-02 (MVP trim)
**Trigger:** User asked to research the best MVP base practice via ctx7 and stop over-engineering.
**Tier:** Plan trim — back to MVP.

#### Decisions Captured
1. **Phase 4 trimmed to MVP.** Removed: cron route, 503 stub, retention thresholds, service-level `updateXStatus` guard, non-barrel export rule, `vercel.json` cron entry, follow-up plan design.
2. **Layer 3 (cron) removed from Cleanup Resolution.** Two layers now: user delete + user re-trigger. Both already ship in phases 1–3.
3. **Error-status invariant simplified.** Zod schemas (no `status`/`statusError` field) is the only enforcement. No service-level guard, no barrel-export rule.
4. **"What's NOT in MVP" section added.** Cron, retention thresholds, service guards are explicit follow-up work, not implicit assumptions.

#### Context7 Sources
- `after()` minimal pattern: [/vercel/next.js/v16.2.9 — after.mdx](https://github.com/vercel/next.js/blob/v16.2.9/docs/01-app/03-api-reference/04-functions/after.mdx) — `after(async () => { ... })` after the response is the entire async return.
- Polling minimal: [/tanstack/query — polling.md](https://github.com/tanstack/query/blob/main/docs/framework/react/guides/polling.md) — `refetchInterval: 5_000` is the entire polling layer.
- Enum default: [/prisma/web — prisma-schema-reference.mdx](https://github.com/prisma/web/blob/main/apps/docs/content/docs/orm/reference/prisma-schema-reference.mdx) — `status: Role @default(USER)` is the schema change.

#### Impact on Plan
- Phase 4 effort: 0.75d → 0.25d. Total plan: 1.5d → 1.75d.
- Cleanup Resolution table: 3 layers → 2 layers (cron removed).
- Error-Status Invariant: 3 enforcement bullets → 1 bullet (Zod only).
- Out of Scope: removed "Cron cleanup implementation" (no cron to defer), added "Cron cleanup of FAILED rows" as a future concern.
- Phase 4 file structure: cutoff design → 3-rule MVP doc.

<!-- slug: async-status-tracking -->