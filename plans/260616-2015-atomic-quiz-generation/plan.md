---
title: "Atomic Quiz Generation (no persisted generating state)"
description: "Make quiz generation crash-safe by removing persisted 'generating' state and the read-time orphan reaper; the DB only ever holds completed quizzes."
status: pending
priority: P1
branch: "feature/issue-69-study-quiz-flow"
tags: [study, quiz, reliability, refactor]
blockedBy: []
blocks: []
created: "2026-06-16T15:33:53.031Z"
createdBy: "ck:plan"
source: skill
---

# Atomic Quiz Generation (no persisted generating state)

## Overview

Replace the client-driven 3-step generation lifecycle (create `generating` row →
`POST` generate → `complete` flip) with a single **server-authoritative atomic
operation**. The database will only ever hold *completed* quizzes; `generating`
and `failed` become **in-memory client states only**. This deletes the orphan
problem class outright — no persisted `generating` row means no read-time reaper,
no 5-minute timeout, no stuck spinner, no locked Quiz button after an interrupted
generation, and no risk of the reaper cascade-deleting a successful quiz.

### Why (root cause this supersedes)
The current as-built (plan `260615-issue-69-study-quiz-flow` Phase 0) flips
`generating → done` in a **separate** client round-trip after `POST` already
persisted the questions. If the app closes between those two calls, the row sits
`generating` with valid questions attached; the read-time reaper in
`fetchStudioArtifacts` then **deletes the artifact and cascade-deletes the valid
questions** (`studio.prisma` `onDelete: Cascade`). During the 5-min window the
Quiz action is locked behind a dead spinner. Mutating data inside a `GET` also
races concurrent reads. This is the "generation hell loop" + local crashes.

### Design decisions (confirmed with user, 2026-06-16 brainstorm)
- **Interrupt behavior:** discard silently. App closed mid-gen → either the server
  request committed (quiz shows `done` on reload) or it didn't (nothing shows;
  user re-clicks). Both states consistent by construction.
- **No persisted `generating`:** the spinner is client-memory only during the
  active request; resets naturally on reload.
- **Atomicity:** `POST /api/studio-questions` creates artifact + writes questions +
  sets `done` in one DB transaction. The LLM call runs *before* the transaction
  (transaction stays short; no 45s call holding a DB connection).
- **Concurrency:** client-side in-memory lock (per session). No server-enforced
  limit.

### Rejected alternative
Keep the 3-step flow and just harden the reaper (flip to `failed` not delete,
move off read path, guard cascade). Keeps the root coupling + a reconciler to
babysit — more moving parts for a strictly worse outcome. Not chosen.

## Scope boundary
- **In:** generation lifecycle (service, route, client hook, artifact service,
  artifact actions, types), legacy-row cleanup, tests, docs.
- **Out:** quiz-taking/scoring (`QuizResult` path), `StudySession` heartbeat,
  flashcards, the 4 pre-existing oddities flagged in the implement-note (404/502
  mismatch, double "Source" label, hardcoded "Results" heading).

## Already done this session (do not redo)
- Lazy-load on artifact view wired (`study-workspace-client.tsx` →
  `handleViewArtifact`).
- `options` stored natively in the `Json` column + defensive parse on read
  (`passage-study.service.ts`, `studio-artifact-actions.ts`).
- Ownership scoping on `studioLoadArtifactDetailAction`.
- Docs: loading-strategy section + corrected orphan wording in
  `docs/API/Routes/studio-artifacts-feature.md`.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Server-authoritative atomic generation](./phase-01-server-authoritative-atomic-generation.md) | Pending |
| 2 | [Client flow simplification](./phase-02-client-flow-simplification.md) | Pending |
| 3 | [Remove reaper + legacy cleanup](./phase-03-remove-reaper-legacy-cleanup.md) | Pending |
| 4 | [Tests and docs](./phase-04-tests-and-docs.md) | Pending |

Key ordering: Phase 1 (server) ships first — it is the new contract. Phase 2
(client) depends on Phase 1's response shape. Phase 3 removes the now-dead reaper
and legacy code (depends on 1+2 landing). Phase 4 verifies the whole thing.

## Verification commands

```bash
pnpm run typecheck
pnpm run lint
pnpm exec vitest --config tests/vitest/vitest.config.ts run src/features/study src/lib/study tests/vitest/integration/components/study
pnpm run test
```

## Dependencies

No cross-plan dependencies. Supersedes the orphan-reaper / ephemeral-delete
as-built in `plans/260615-issue-69-study-quiz-flow` Phase 0 — that plan stays as
the historical record; this plan is the forward design. Reference note:
`implement-notes/260616-1946-quiz-result-persistence-and-generation-reliability.md`.
