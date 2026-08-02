---
title: "Phase 4: MVP cleanup rules"
status: todo
priority: P2
effort: "0.25d"
dependencies: ["phase-02-artifact-async-status", "phase-03-upload-flow-refactor"]
---

# Phase 4: MVP cleanup rules

## Overview

Define the **minimum** cleanup rules that make phases 1–3 shippable. No cron, no retention, no invariant-enforcement service layer. Just three rules documented in code.

This phase is intentionally small. Cleanup automation (cron, retention thresholds, scheduled deletes) is a follow-up plan, not MVP. MVP is: "we know what happens to a failed row, and the user can always delete it."

## The Three Rules

### Rule 1 — User delete works on PENDING + FAILED

The existing `DELETE /api/passage/[id]` and `DELETE /api/artifact/[id]` already allow deletes on any status (`userId` ownership is the only guard). This rule is **already true** by Phase 1+2 design. Phase 4 verifies by reading the code and writing one test.

**Verify:**
- `src/app/api/passage/[id]/route.ts` — DELETE handler does not check status
- `src/app/api/artifact/[id]/route.ts` — DELETE handler does not check status
- `src/features/passage/server/service/passage-crud.ts` — `deletePassage` does not check status
- `src/features/studio/server/service/artifact-crud.ts` — `deleteArtifact` does not check status

**Acceptance:** A PENDING row and a FAILED row can both be deleted via the existing UI (the delete affordance is already wired in Phase 2 + 3). No code change unless an anomaly is found.

### Rule 2 — User re-trigger is the retry path

Already shipped by Phase 2 + 3:
- Failed artifact → user re-clicks "Generate" → new PENDING row → polls → completes or fails again
- Failed passage → user clicks delete, then opens upload modal, re-submits

No code. No tests beyond what Phase 2 + 3 already have.

### Rule 3 — Failed rows are marked as such, never auto-rewritten

**Only the processing step can write `status: FAILED` or `statusError`.**

Minimum enforcement (1 file, ~10 lines):
- The Zod schemas for `PATCH /api/passage/[id]` and `PATCH /api/artifact/[id]` do not include `status` or `statusError`. Clients cannot PATCH them.
- Done. No service-level guard, no barrel-export restriction, no grep enforcement. Just Zod.

If a future feature needs auto-recovery (e.g. "retry with reduced input"), it creates a new row, not patch the failed one — the schema enforces this naturally.

## What's NOT in MVP

These are real concerns. They ship in a follow-up plan, not this one. Documented here so the gap is explicit, not invisible.

| Concern | Why deferred | When it matters |
|---|---|---|
| Cron cleanup of FAILED rows | Daily Vercel cron + auth + retention threshold is non-trivial work for a feature that has not yet shipped | When production shows FAILED rows accumulating |
| Cron cleanup of PENDING rows | PENDING is a live signal; auto-cleanup breaks the "DB is truth" promise. User delete is the only path. | When user complains about orphaned PENDINGs |
| Service-level `updateXStatus` guard | Zod rejection at the API boundary is sufficient for MVP. Internal code review covers the rest. | When a future engineer writes a status-overwriting route |
| Retention thresholds | 1h / 7d / 30d are guesses. The real threshold is "what hurts when we don't have it?" | When we have data on FAILED accumulation rate |
| `vercel.json` cron entry | Vercel cron is a Vercel-deploy-only feature. We don't know yet if we'll deploy on Vercel. | When we deploy to production |

## Requirements

- [ ] Verify DELETE routes: no status gate on `DELETE /api/passage/[id]` and `DELETE /api/artifact/[id]`
- [ ] Verify Zod schemas: `passageUpdateSchema` and `artifactUpdateSchema` do not include `status` or `statusError`
- [ ] If either verification fails, fix it (small change, this phase)
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Implementation Steps

1. **Read** the four files above. Confirm each is correct.
2. **If a Zod schema includes `status` or `statusError`**, remove it. That's the only code change in this phase.
3. **If a DELETE handler has a status filter**, remove it. Same.
4. **Run** typecheck, lint, knip. Done.

## Success Criteria

- [ ] A PENDING row can be deleted via existing UI
- [ ] A FAILED row can be deleted via existing UI
- [ ] `curl -X PATCH /api/passage/<id> -d '{"status":"COMPLETED"}'` → 400 (Zod rejection)
- [ ] `curl -X PATCH /api/artifact/<id> -d '{"statusError":"fake"}'` → 400 (Zod rejection)
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` clean

## Follow-up Plan (separate, not now)

When production data shows FAILED rows accumulating, write a follow-up plan that:

1. Adds `cleanupStuckArtifacts()` / `cleanupStuckPassages()` service functions.
2. Adds a Vercel cron route handler at `src/app/api/internal/cleanup-stuck/route.ts` with `CRON_SECRET` auth.
3. Wires `vercel.json` `crons` array.
4. Sets retention thresholds based on actual data.

The current plan should not pre-commit to any of that. The MVP is "user can delete, status field is honest".

## Risk Assessment

- **Stale PENDING rows accumulating**: if a server crashes mid-AI, the PENDING row is orphaned. User must delete. Acceptable for MVP — YAGNI.
- **FAILED rows accumulating**: same as PENDING. User delete + re-trigger creates a fresh row. Acceptable for MVP.
- **No scheduled cleanup**: a high-traffic app could see thousands of FAILED rows accumulate before a follow-up plan ships. Mitigation: monitor the production DB after launch; if `count(*) where status='FAILED'` > 1000, write the follow-up plan immediately.

## Acceptance Tests

```typescript
// Manual
1. Upload a passage, immediately kill the server during AI processing → row stays PENDING
2. Click delete on the PENDING passage → row removed, no error
3. Force an AI failure (mock) → row goes FAILED with statusError
4. Click delete on the FAILED artifact → row removed, no error
5. Try to PATCH a passage with `{ status: "COMPLETED" }` body → 400
6. Try to PATCH an artifact with `{ statusError: "fake" }` body → 400
7. TypeScript, lint, knip pass
```
