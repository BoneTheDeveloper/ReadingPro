---
title: "Translate Flow Performance Implementation"
description: "Performance implementation plan for the quick translate flow based on the current benchmark report and test report gaps. Focus is reducing Prisma round trips before micro-optimizing route code."
status: pending
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

The current bottleneck is database round trips in `/api/translate`, not rendering or generic Next.js overhead. The latest benchmark artifact at `test-results/performance/translate-flow.json` shows:

| Scenario | Route total | Round trip | Prisma queries | Prisma time | Main bottleneck |
|----------|-------------|------------|----------------|-------------|-----------------|
| single-word dictionary hit | 778.45 ms | 2085.35 ms | 7 | 724.80 ms | cold request + 3-query dictionary resolve |
| phrase dictionary hit | 728.52 ms | 754.85 ms | 7 | 707.34 ms | 3-query dictionary resolve |
| fallback miss | 1025.55 ms | 1053.92 ms | 9 | 993.79 ms | 5-query dictionary miss path |
| cache repeat | 315.66 ms | 342.92 ms | 3 | 304.15 ms | source fetch + cache read + history create |

Because each Prisma call costs roughly 100 ms in the current environment, query count is the highest-leverage optimization target. This plan intentionally does not start with UI work, Playwright setup, or broad refactors. It first creates reliable performance budgets, then collapses dictionary lookup round trips, then reduces unavoidable translate-flow writes, and finally hardens the benchmark so regressions are caught.

## Current Bottleneck Priority (single-word dictionary hit path)

**Focus: single-word dictionary hit first. Fallback/miss path deferred.**

Single-word hit current state: **7 queries, 778ms** — step breakdown:

| Step | Queries | Time | Purpose |
|------|---------|------|---------|
| `sourceFetch` | 1 | 118ms | ownership check |
| `cacheRead` | 1 | 102ms | cache miss (first request) |
| `dictionaryResolve` | 3 | 331ms | sequential exact → alias → fallback probe |
| `cacheWrite` | 1 | 113ms | store result |
| `historyCreate` | 1 | 106ms | audit log |
| **Total** | **7** | **778ms** | |

Query cut plan for single-word hit path (**7 → ≤4 queries**):

| Priority | Bottleneck | Evidence | Query Cut | Target Phase |
|----------|------------|----------|-----------|--------------|
| P1 | No enforceable budgets | Benchmark only asserts shape, no thresholds | Budget gate enforces cuts | 1 |
| P2 | `dictionaryResolve` sequential probes | 3 sequential queries for one word lookup | **3→1-2 queries** (−1 to −2) | 2 |
| P3 | `sourceFetch` + `cacheRead` separate reads | 2 reads where 1 could carry both ownership + cache | **2→1 query** (−1) | 3 |
| P3 | `historyCreate` blocks response | 1 blocking write for audit only | **non-blocking** (−1 blocking) | 3 |
| P4 | Cold-start overhead distorts round-trip | `roundTripMs` 2085ms vs route 778ms | warm-up discard | 1 |

## Code Location Map (single-word dictionary hit flow)

### Route orchestrator

| File | Lines | Role |
|------|-------|------|
| `src/app/api/translate/route.ts` | 69-431 | Main POST handler, all 7 queries called from here |

### Step-to-function mapping

| Step | Function | File | Line | Prisma op | Shared with other flows? |
|------|----------|------|------|-----------|--------------------------|
| `sourceFetch` | `getOwnedTranslationSource()` | `src/lib/db/translation-queries.ts` | :66 | `passage.findUnique` | **Yes** — `/api/vocabulary` (`src/app/api/vocabulary/route.ts:78`) |
| `cacheRead` | `getTranslationCache()` | `src/lib/db/translation-queries.ts` | :73 | `translationCache.findUnique` | No — translate only |
| `dictionaryResolve` | `resolveQuickDictionaryTranslation()` → `resolveQuickDictionaryLookup()` | `src/lib/dictionary/resolve-quick-dictionary-translation.ts` :20 → `src/lib/dictionary/resolve-dictionary-lookup.ts` :40 | :20, :40 | `findEntryByHeadword()` (:68, 1q) + `findEntryByAlias()` (:85, 1-2q) = 3q | Internals shared with `/api/dictionary` (`src/app/api/dictionary/route.ts:60`) via `resolveDictionaryLookup()` which also calls `findEntryByHeadword`/:68 and `findEntryByAlias`/:85 |
| `cacheWrite` | `upsertTranslationCache()` | `src/lib/db/translation-queries.ts` | :80 | `translationCache.upsert` | No — translate only |
| `historyCreate` | `createTranslationHistory()` | `src/lib/db/translation-queries.ts` | :104 | `translationHistory.create` | No — translate only |

### Shared function risk

| Function | Shared by | Risk if modified | Mitigation |
|----------|-----------|------------------|------------|
| `getOwnedTranslationSource()` | `/api/vocabulary` | Vocabulary route breaks if signature changes | Do NOT modify — combine at route level in translate only |
| `findEntryByHeadword()` | `/api/dictionary` full DTO | Dictionary API breaks if query shape changes | Do NOT modify — add NEW lean helper alongside |
| `findEntryByAlias()` | `/api/dictionary` full DTO | Dictionary API breaks if query shape changes | Do NOT modify — add NEW lean helper alongside |

## Dependencies

This plan depends on `plans/260531-dictionary-mvp-feature` because the dictionary schema, quick lookup contract, seed data, and generated benchmark dataset are still part of that active feature plan. Performance work can be implemented in the same branch, but it should not finalize until the dictionary MVP route contracts are stable.

## Non-Goals

- Do not optimize detailed AI translation in this plan.
- Do not introduce Redis or an external cache before exhausting query-shape fixes.
- Do not remove translation history unless product explicitly accepts that analytics/audit loss.
- Do not tune based only on `roundTripMs`; use route timings and Prisma metrics as the primary signal.
- Do not optimize fallback/miss path in this iteration — focus on single-word dictionary hit first.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Bottleneck Baseline and Performance Budgets](./phase-01-bottleneck-baseline-and-performance-budgets.md) | Pending |
| 2 | [Hot Path Query Optimization](./phase-02-hot-path-query-optimization.md) | Pending |
| 3 | [Write Path and Cache Efficiency](./phase-03-write-path-and-cache-efficiency.md) | Pending |

**Execution order:** [implementation-steps.md](./implementation-steps.md) — 8 atomic steps with budget tightenings.
| 4 | [Regression Gates and Documentation](./phase-04-regression-gates-and-documentation.md) | Pending |

## Success Criteria

- Single-word dictionary hit reduced from 7 Prisma queries to **at most 4**.
- `dictionaryResolve` collapsed from 3 queries to **at most 1-2** for single-word hit.
- `sourceFetch` + `cacheRead` combined or one eliminated — **at most 1 blocking read** for cache-hit path.
- `historyCreate` is non-blocking or the only documented remaining blocking query.
- Benchmark includes warm-up handling and budget gates for single-word hit.
- Fallback/miss path budgets remain tracked but are not a blocker for this iteration.
