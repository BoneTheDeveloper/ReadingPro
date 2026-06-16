---
title: 'Restructure app: enforced server/ + shared/ contract + HTTP-first'
description: ''
status: pending
priority: P2
branch: feature/issue-69-study-quiz-flow
tags: []
blockedBy: []
blocks: []
created: '2026-06-16T21:18:37.235Z'
createdBy: 'ck:plan'
source: skill
---

# Restructure app: enforced server/ + shared/ contract + HTTP-first

## Overview

Restructure the codebase so the frontend/backend boundary is explicit and compiler-enforced, and so a future standalone backend lift is mechanical. Origin: brainstorm decision (option B — hybrid, staged). The code already respects the boundary informally (no client component imports `@/lib`); this plan formalizes and enforces it, relocates files so the layout *shows* the split, and standardizes all mutations on HTTP routes (drops server actions) for future mobile/2nd-client readiness.

**Target layout**
- `src/app/` — routing only (thin pages + thin `route.ts` HTTP adapters).
- `src/server/` — all backend (`ai/`, `db/`, `auth/`, `http/`, `modules/<domain>`), each entry marked `import 'server-only'`.
- `src/features/<domain>/` — frontend (FSD): `ui/ hooks/ model/ api/`; `api/` is the only door to the backend.
- `src/shared/<domain>/` — the contract: zod schemas + DTO types, pure (zod + `import type` only), imported by both sides.
- `src/components/`, `src/ui/` — shared design-system primitives.

**Four invariant rules**
1. `server/` entries are `server-only` (build fails if a client bundle imports them). Server Components, server actions, and route handlers may import `server/`; client components may not.
2. Frontend → backend goes through `features/<d>/api/` only.
3. `shared/` stays pure — never re-exports from `server/`.
4. Mirror the domain word across layers: `features/study` ↔ `app/api/study-*` ↔ `server/modules/study` ↔ `shared/study`.

**Scope boundary**
- IN: server-only enforcement, lib→server / schema→shared relocation, convert ALL server actions to API routes + `features/api` callers, docs/ADR, verification.
- OUT (separate future plan): async worker / queue for long AI jobs; actual extraction into a standalone Hono service (deferred until mobile is real).

**Key constraint**: behavior-preserving refactor. Existing Vitest suites are the safety net and must stay green at every phase. No business-logic changes.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Enforce server-only boundary](./phase-01-enforce-server-only-boundary.md) | Completed |
| 2 | [Relocate lib to server and schemas to shared](./phase-02-relocate-lib-to-server-and-schemas-to-shared.md) | Completed |
| 3 | [HTTP-first transport (convert all server actions to API routes)](./phase-03-http-first-transport-convert-all-server-actions-to-api-route.md) | Pending |
| 4 | [Docs ADR and verification sweep](./phase-04-docs-adr-and-verification-sweep.md) | Pending |

## Dependencies

- No blocking cross-plan dependencies. Sequential: Phase 1 → 2 → 3 → 4.
- Follow-on (not blocking): a future "async worker / queue for long AI jobs" plan, and an eventual "extract standalone Hono backend" plan, both building on the `src/server/` boundary established here.

## Validation Log

### Session 1 (validate)

**Verification Results** (Standard tier — 4 phases)
- Claims checked: ~22 | Verified: 21 | Failed: 0 | Unverified: 0
- All 18 `src/lib/*` subdirs to be moved exist. `server-only` absent from repo (confirmed). tsconfig alias `@/* → ./src/*` confirmed. No `passages` route dir yet (new routes correct).
- Finding: `analyzeContentAction` referenced nowhere in `src` → confirmed dead code.
- Finding: `studyUploadAction` (→ `createPassageRecord`) ≠ `POST /api/upload/text` (→ `analyzeAndPersistContent`). They are different operations; reuse would be a bug.

**Decisions confirmed**
1. `analyzeContentAction` → **delete** (dead code), not converted. Propagated to Phase 3 steps + map.
2. New mutation route naming → **nest under `/api/study/*`** (passages). Artifact/quiz ops extend the existing `/api/studio-artifacts` family to avoid duplicate route families (flagged as minor known inconsistency; full unification deferred). Propagated to Phase 3 map.
3. eslint import-boundary guard → **required** (not optional). Propagated to Phase 4 steps + success criteria.

**Whole-Plan Consistency Sweep**
- Re-read `plan.md` + all 4 phase files. `studyUpload`/`upload/text` distinction now consistent in Phase 3. Route naming consistent (`/api/study/*` + studio-artifacts extension). eslint guard consistent between Phase 4 steps and criteria. No stale `analyzeContentAction`-convert references remain. No contradictions outstanding.
- Result: **0 unresolved contradictions** — eligible for implementation.
