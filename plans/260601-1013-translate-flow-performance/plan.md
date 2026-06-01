---
title: "Translate Flow Performance Implementation"
description: "Performance optimization for the quick translate flow. Query cuts first, benchmark gate fitted after — measure once the improvements are real."
status: in-progress
priority: P1
branch: "feat/dictionary-mvp"
tags: [performance, translate, dictionary, database, benchmark]
blockedBy: [260531-dictionary-mvp-feature]
blocks: []
created: "2026-06-01T03:13:24.546Z"
createdBy: "ck:plan"
source: skill
---

# Translate Flow Performance Implementation

## Overview

The current bottleneck is database round trips in `/api/translate`, not rendering or generic Next.js overhead. Baseline artifact at `test-results/performance/translate-flow.json` (2026-06-01):

| Scenario | Route total | Prisma queries | Prisma time | Main bottleneck |
|----------|-------------|----------------|-------------|-----------------|
| single-word dictionary hit | 778 ms | 7 | 725 ms | 3-query dictionary resolve |
| phrase dictionary hit | 729 ms | 7 | 707 ms | 3-query dictionary resolve |
| fallback miss | 1026 ms | 9 | 994 ms | 5-query dictionary miss |
| cache repeat | 316 ms | 3 | 304 ms | source fetch + cache read + history |

**Strategy: cut first, measure after.** Each Prisma call costs ~100 ms. Query count is the highest-leverage target. We implement the cuts, then fit the benchmark gate to the optimized state — no point building gates around a baseline that's about to change.

## Query Cut Map (single-word dictionary hit, 7 → ≤4)

| Step | Current | Cut | Owner phase |
|------|---------|-----|-------------|
| `dictionaryResolve` | 3q (331ms) | 3→1-2q | Phase 1 |
| `sourceFetch` + `cacheRead` | 2q (220ms) | 2→1q | Phase 2 |
| `historyCreate` | 1q blocking (106ms) | non-blocking | Phase 2 |
| `cacheWrite` | 1q (113ms) | unchanged | — |
| `sourceFetch` (auth) | 1q (118ms) | merged | Phase 2 |

## Code Location Map

| Step | Function | File | Line | Shared? |
|------|----------|------|------|---------|
| `sourceFetch` | `getOwnedTranslationSource()` | `src/lib/db/translation-queries.ts` | :66 | **Yes** — `/api/vocabulary` |
| `cacheRead` | `getTranslationCache()` | `src/lib/db/translation-queries.ts` | :73 | No |
| `dictionaryResolve` | `resolveQuickDictionaryLookup()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :40 | Internals shared with `/api/dictionary` |
| `cacheWrite` | `upsertTranslationCache()` | `src/lib/db/translation-queries.ts` | :80 | No |
| `historyCreate` | `createTranslationHistory()` | `src/lib/db/translation-queries.ts` | :104 | No |

**Rule:** Do NOT modify `findEntryByHeadword()`, `findEntryByAlias()`, or `getOwnedTranslationSource()` — shared with other routes. Add new lean helpers alongside.

## Dependencies

Depends on `plans/260531-dictionary-mvp-feature` — dictionary schema and seed data must be stable.

## Non-Goals

- Do not optimize detailed AI translation.
- Do not introduce Redis or external cache.
- Do not remove translation history.
- Do not optimize fallback/miss path this iteration.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Hot Path Query Optimization](./phase-01-hot-path-query-optimization.md) | Pending |
| 2 | [Write Path and Cache Efficiency](./phase-02-write-path-and-cache-efficiency.md) | Pending |
| 3 | [Benchmark Gate and Documentation](./phase-03-benchmark-gate-and-documentation.md) | Pending |

**Execution order:** [implementation-steps.md](./implementation-steps.md) — 5 atomic steps.

## Success Criteria

- Single-word dictionary hit reduced from 7 Prisma queries to **at most 4 blocking**.
- `dictionaryResolve` collapsed from 3 queries to **1-2**.
- `sourceFetch` + `cacheRead` combined — **at most 1 blocking read**.
- `historyCreate` is non-blocking.
- Benchmark gate enforces ≤4 query budget with warm-up handling.

## Validation Log

### Session 1 — 2026-06-01
**Trigger:** Pre-implementation validation interview
**Questions asked:** 4

#### Verification Results
- **Tier:** Standard (3 phases)
- **Claims checked:** 10
- **Verified:** 10 | **Failed:** 0 | **Unverified:** 0

All file paths, function names, line numbers, and shared-function claims verified against codebase.

#### Questions & Answers

1. **[Architecture]** Phase 1 dictionary lookup approach: raw $queryRaw vs Prisma $transaction?
   - Options: Raw $queryRaw | Prisma $transaction | Try raw first, fallback if tests fail
   - **Answer:** Raw $queryRaw
   - **Rationale:** Maximum query reduction (3→1), app is PostgreSQL-only.

2. **[Architecture]** historyCreate blocking behavior?
   - Options: Non-blocking is fine | Keep blocking
   - **Answer:** Non-blocking is fine
   - **Rationale:** History is analytics/audit only. Failed writes logged, don't block response.

3. **[Assumptions]** Cache hit proves ownership for sourceFetch+cacheRead merge?
   - Options: Cache proves ownership | Always fetch source first
   - **Answer:** Cache proves ownership
   - **Rationale:** Cache keyed by userId+sourceId — hit already proves ownership. Skip redundant fetch.

4. **[Scope]** Defer fallback/miss path optimization?
   - Options: Defer fallback | Cut fallback too
   - **Answer:** Defer fallback
   - **Rationale:** Single-word hit is the common path. Fallback is less frequent, higher complexity.

#### Confirmed Decisions
- Raw SQL for dictionary lookup: $queryRaw with LEFT JOINs
- historyCreate: fire-and-forget with error logging
- sourceFetch+cacheRead: cache-first ownership proof
- Scope boundary: fallback/miss deferred to future iteration
