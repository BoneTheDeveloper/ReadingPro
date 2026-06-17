---
title: "Docs SSOT Reorg + Src Layer Re-naming"
description: ""
status: pending
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: []
blockedBy: []
blocks: []
created: "2026-06-17T08:37:35.249Z"
createdBy: "ck:plan"
source: skill
---

# Docs SSOT Reorg + Src Layer Re-naming

## Overview

Two-track reorg for agent/human clarity. **Docs track** (Phases 1-3): move requirements
docs into a single-source-of-truth `docs/Requirements/`, dedupe use-cases, add user-stories
+ test-scenarios + traceability-matrix, clarify `Database`/`Product` folder roles, and make
`code-standards.md` the one lean convention hub (incl. import-path rule). **Src track**
(Phases 4-5): full layer re-naming (Scheme 1 — `shared→contracts`, `components→ui`, kill
`core`/`domain`/`api` overloads) + ESLint enforcement of the import convention.

`src/app/` is Next.js-reserved and is NOT renamed. Source brainstorm:
[brainstorm-summary.md](./brainstorm-summary.md).

TDD note: Phases 4-5 are behavior-preserving refactors. "Tests-first" = capture the green
baseline (`typecheck && lint && test`) as the regression contract before any move, then
re-verify identical green after. No new unit tests are authored for pure renames.

Sequencing: docs (low risk) → src rename (high churn, isolated commit). Phases 1-3 are
independent of 4-5; 5 depends on 4.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Docs SSOT Reorg](./phase-01-docs-ssot-reorg.md) | Pending |
| 2 | [New Requirement Docs](./phase-02-new-requirement-docs.md) | Pending |
| 3 | [Convention Hub + Import Rule](./phase-03-convention-hub-import-rule.md) | Pending |
| 4 | [Src Layer Rename](./phase-04-src-layer-rename.md) | Pending |
| 5 | [ESLint Enforcement](./phase-05-eslint-enforcement.md) | Pending |

## Dependencies

Internal: Phase 2 depends on Phase 1; Phase 5 depends on Phase 4. Phases 1-3 (docs) are
independent of Phases 4-5 (src). No cross-plan dependencies detected.

## Validation Log

### Validation Session 1 — 2026-06-17

#### Verification Results
- Tier: Full (5 phases). Claims checked: 8. Verified: 8 | Failed: 0 | Unverified: 0.
- `src/server/observability/` exists (`prisma-query-metrics.ts`), no `logger.ts` collision → logger merge safe.
- 2 relative-import violations confirmed: `src/server/db/passage-queries.test.ts`, `src/server/auth/auth-utils.test.ts`.
- 5 `features/*/api` dirs; no bare `@/shared` imports → `@/*` catch-all safely covers dropped `@/shared/*` alias.
- No `src/contracts` or `src/ui` pre-existing → no rename collision.

#### Decisions Confirmed
1. Feature fetcher folders: `features/*/api` → **`features/*/api-client`** (not `data`). Propagated to Phase 4.
2. Logger: **merge `server/core` → `server/observability`** (confirmed safe). Phase 4 unchanged.
3. ESLint: **ban cross-layer + deep escapes** (`../../<layer>/*` and `../../../**`). Matches Phase 5 as written.
4. Dead links: **remove all, create no stubs.** Propagated to Phase 3.

#### Whole-Plan Consistency Sweep
- Re-read all phase files. `features/*/data` references replaced with `api-client` (Phase 4 only location).
- Dead-link policy now consistently "remove-only" across Phase 3 architecture/steps/risk.
- No stale `data`/stub references remain. Zero unresolved contradictions.
- Recommendation: **proceed to implementation.**
