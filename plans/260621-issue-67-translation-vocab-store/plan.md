---
title: "Issue 67: Vocabulary Save Contract & Dedup Store Strategy"
description: ""
status: pending
priority: P2
branch: "feature/issue-67-translation-contract"
tags: []
blockedBy: []
blocks: []
created: "2026-06-21T09:50:55.167Z"
createdBy: "ck:plan"
source: skill
---

# Issue 67: Vocabulary Save Contract & Dedup Store Strategy

## Overview

Fix the silent vocabulary-save failure and harden the save store model for issue #67.
Two server-side changes, no UI work (UI deferred per brainstorm):

1. **Contract:** `POST /api/vocabulary` maps the persisted record to the `.strict()`
   `vocabularyDataSchema` DTO at the route boundary — today it returns the raw Prisma
   row, which the client's strict parse always rejects → save looks failed.
2. **Store strategy:** dedup on a **normalized** translation so casing/provider-noise
   variants of the same meaning collapse, while genuinely different meanings split.

The dev DB is disposable (reset, no production data), so the migration is a plain
schema change — no backfill/merge. Dedup is verified by a pure unit test plus a manual
dev-DB checklist (the test suite is mock-based by design).

TDD: every phase writes the failing test first, then the implementation to green.

**Source:** [brainstorm-summary.md](./brainstorm-summary.md)
**Spec docs:** `docs/Flows/data-flows/vocabulary-flow.md`, `docs/API/Routes/vocabulary/items.md`,
`docs/Requirements/software-requirements.md` (FR-05b).

## Scope

- **In:** route DTO mapping, `normalizedTranslation` column + unique key, query
  normalization, plain schema migration + `migrate reset` (no backfill/merge — dev DB
  is disposable), delete dead `translation-queries.saveVocabularyItem`, tests.
- **Out (later round):** popup Save button, in-flight guard, Saved-state UI in
  `translation-popup.tsx` / `study-workspace-client.tsx`. Sense-level (dictionary)
  identity keying. Dictionary FK ownership validation. (Client saved-state key
  divergence — M3 — is documented in Phase 3 for the UI round.)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Response Contract DTO](./phase-01-response-contract-dto.md) | Pending |
| 2 | [Dedup Store Strategy & Migration](./phase-02-dedup-store-strategy-migration.md) | Pending |
| 3 | [Integration & Regression Coverage](./phase-03-integration-regression-coverage.md) | Pending |

## Key Files

| File | Role |
|------|------|
| `src/app/api/vocabulary/route.ts` | POST handler — add Prisma→DTO mapping |
| `src/contracts/translation/translation-response-schema.ts` | `vocabularyDataSchema` (target DTO — unchanged) |
| `prisma/schema/vocabulary.prisma` | add `normalizedTranslation`; change `@@unique` |
| `src/server/db/vocabulary-queries.ts` | normalize translation; key upsert on it |
| `src/server/db/translation-queries.ts` | **delete** dead `saveVocabularyItem` (old key) |
| `tests/vitest/integration/api/vocabulary-save-route.test.ts` | contract regression (mocked) |
| `tests/vitest/integration/api/translation-vocabulary-routes.test.ts` | contract suite |

## Dependencies

No cross-plan dependencies. Phase 1 → 2 → 3 are sequential (2 depends on the DTO
shape from 1; 3 exercises the contract end-to-end).

## Red Team Review

### Session — 2026-06-21
**Findings:** 13 (after dedup of 23 raw) — all evidence-passed.
**Severity:** 3 Critical, 5 High, 5 Medium.
**Disposition:** 6 applied; 7 dismissed as moot (dev DB is reset → no data migration).

| # | Finding | Sev | Disposition | Applied To |
|---|---------|-----|-------------|------------|
| C1 | Dedup untestable — suite mocks Prisma | Crit→High | Accept (pure unit + manual dev-DB checklist; no real-DB harness per user) | Phase 2/3 |
| C2 | SQL backfill ≠ JS normalize (NBSP/locale) | Crit | Dismiss — no backfill (DB reset) | — |
| C3 | Set-item repoint aborts migration | Crit | Dismiss — no merge (DB reset) | — |
| H1 | Unlocked unique swap races live writes | High | Dismiss — no live data (DB reset) | — |
| H2 | Merge discards SRS progress | High | Dismiss — no merge | — |
| H3 | NULL occurrences not deduped in merge | High | Dismiss — no merge | — |
| H4 | Dead `saveVocabularyItem` on old key → typecheck break | High | Accept — delete it | Phase 2 |
| H5 | No rollback/snapshot | High | Dismiss — `migrate reset` is rollback | — |
| M1 | `CREATE UNIQUE INDEX` table lock | Med | Dismiss — empty table | — |
| M2 | `toISOString()` crashes on string date | Med | Accept — `new Date(...)` | Phase 1 |
| M3 | Client saved-state key diverges from server dedup | Med | Accept — document for UI round | Phase 3 |
| M4 | Phase 1 is a data-exposure fix, not cosmetic | Med | Accept — relabel + consumer grep | Phase 1 |
| M5 | `type ?? null` dead branch | Med | Accept — use `item.type` | Phase 1 |

### Whole-Plan Consistency Sweep
- Removed all backfill/merge/locking/snapshot language from Phase 2 (DB-reset decision);
  reconciled Phase 3 to not assert dedup against mocks; effort lowered (P2 4h→2.5h, P3 2h→1.5h).
- Added `translation-queries.ts` (dead-code delete) to scope in plan + Phase 2.
- M3 client-divergence documented in Phase 3 and brainstorm summary; "client already
  correct" wording softened. No remaining contradictions.
