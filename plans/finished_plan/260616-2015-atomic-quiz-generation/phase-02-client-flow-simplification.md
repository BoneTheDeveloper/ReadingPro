---
phase: 2
title: "Client flow simplification"
status: pending
priority: P1
effort: "4h"
dependencies: [1]
---

# Phase 2: Client flow simplification

## Overview
Collapse the client generation flow to: in-memory optimistic `generating` card →
single `POST` → swap for the returned `done` artifact (success) or drop the card +
show a transient retry banner (failure). No server actions for create/complete/
delete-on-failure. The action lock is purely in-memory and resets on reload.

## Requirements
- Functional: clicking Quiz adds an optimistic card to client state only (never
  persisted), calls `generateStudioQuestions`, then:
  - success → replace optimistic card with `result.artifact` + cache
    `result.questions` in `artifactDetailById`.
  - failure → remove the optimistic card, set the transient error banner
    (localized via existing `StudioArtifactErrorCode`), offer Retry.
- Functional: Retry re-runs `POST` (same `artifactId` for a stable card id);
  re-entrancy guard preserved.
- Functional: Quiz action lock derives from in-memory optimistic `generating`
  cards in the active passage's cache (already the case) — no DB dependency.
- Non-functional: the passage-switch behavior stays correct (a success still
  lands in its originating passage's cache).

## Architecture
- `handleActionClick`: `crypto.randomUUID()` → optimistic card (memory) → `POST`.
- `generateQuizArtifact`: on success use `result.artifact`/`result.questions`
  directly; remove `studioCompleteArtifactAction` call. On error call the
  simplified `failQuizArtifact` (no DB delete — there is no persisted row).
- `retryQuizArtifact`: drop the `studioCreateArtifactAction` recreate; just set the
  card `generating` in memory and re-`POST`.

## Related Code Files
- Modify: `src/features/study/hooks/use-study-actions.ts` — rewrite
  `handleActionClick`, `generateQuizArtifact`, `failQuizArtifact`,
  `retryQuizArtifact`; drop create/complete/delete action calls.
- Modify: `src/features/study/api/studio-questions-client.ts` — return type adds
  `artifact`; surface it on success.
- Read for context: `src/features/study/ui/study-workspace-client.tsx` (cache
  shape, optimistic merge), `src/features/study/ui/studio/studio-panel.tsx`
  (lock + failed-card rendering).

## Implementation Steps
1. Update `studio-questions-client.ts` `GenerateStudioQuestionsResult` success
   shape to `{ artifact, questions }`; map from the new response.
2. `handleActionClick`: remove `studioCreateArtifactAction`; keep optimistic
   in-memory card; call `generateQuizArtifact`.
3. `generateQuizArtifact`: on success swap optimistic card → `result.artifact`,
   cache questions; remove `studioCompleteArtifactAction`.
4. `failQuizArtifact`: remove the `studioDeleteArtifactAction` call and the DB
   concern; keep the transient failed card + banner + errorCode.
5. `retryQuizArtifact`: remove recreate; re-`POST` under same id with the
   re-entrancy guard.
6. `pnpm run typecheck` + `pnpm run lint`.

## Success Criteria
- [ ] Generating spinner exists only in memory; a reload mid-generation shows no
      card (or the `done` quiz if the server committed).
- [ ] No `studioCreateArtifactAction` / `studioCompleteArtifactAction` /
      `studioDeleteArtifactAction` calls remain in the generation path.
- [ ] Quiz lock releases correctly after success, failure, and reload.
- [ ] Retry regenerates without creating duplicate rows.
- [ ] typecheck + lint clean.

## Risk Assessment
- **Optimistic card id vs server id mismatch** → client passes `artifactId` to
  `POST`; server uses it, so the id is stable from optimistic → done (no swap of
  keys, just status/data).
- **Two tabs generating same passage** → distinct ids → two quizzes (allowed);
  same id → server idempotency returns one. Acceptable.
