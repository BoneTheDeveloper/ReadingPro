---
phase: 3
title: "Dictionary and Translation Stability"
status: Completed
priority: P1
effort: "2-3d"
dependencies: [2]
---

# Phase 3: Dictionary and Translation Stability

## Overview

Stabilize the dictionary data pipeline and translation resolution paths without changing the public API contracts. This phase focuses on seed quality, deterministic ranking, cache/history behavior, and query-budget preservation.

## Requirements

- Functional: dictionary suggest/search/lookup/entry-detail return deterministic bounded results; translation preserves dictionary, phrase, fallback, and cache-repeat behavior; seed/import validation catches malformed data before deploy.
- Non-functional: dictionary and translation query budgets remain within `tests/performance/query-budget-benchmarks.md`; runtime dictionary lookup does not call external providers.
- Seed check rule: source validation is file-only and runs in local/PR CI; remote seed status is read-only and runs in local, preview, and protected production workflows; mutating seed/import runs only with explicit approval in a trusted environment.

## Architecture

Dictionary routes call service modules under `src/lib/dictionary/**`, which call repository modules and DTO builders. Translation goes through `src/lib/translation/inline/inline-translate.service.ts`, reads cache/source in one step, resolves dictionary/phrase/fallback paths, and persists history/cache asynchronously.

Translation cache policy follows the conservative exact-cache strategy: cache only successful final inline translation DTOs by exact `userId`, `sourceId`, selected text, context sentence, and target language. Cache hits must still verify source ownership in the same request before returning cached data. Do not normalize keys, share cache entries across users/sources/contexts, cache errors/source misses, or cache dictionary route responses in Phase 3.

## Related Code Files

- Modify: `src/lib/dictionary/lookup/lookup.service.ts`
- Modify: `src/lib/dictionary/lookup/lookup.repository.ts`
- Modify: `src/lib/dictionary/search/search.service.ts`
- Modify: `src/lib/dictionary/search/search.repository.ts`
- Modify: `src/lib/dictionary/suggest/suggest.service.ts`
- Modify: `src/lib/dictionary/suggest/suggest.repository.ts`
- Modify: `src/lib/dictionary/entry-detail/entry-detail.service.ts`
- Modify: `src/lib/dictionary/entry-detail/entry-detail.repository.ts`
- Modify: `src/lib/dictionary/shared/dictionary-dto-builders.ts`
- Modify: `src/lib/dictionary/shared/dictionary-response-schema.ts`
- Modify: `src/lib/translation/inline/inline-translate.service.ts`
- Modify: `src/lib/translation/inline/inline-translate.repository.ts`
- Modify: `src/lib/translation/inline/word-translate.ts`
- Modify: `src/lib/translation/inline/sentence-translate.ts`
- Modify: `src/lib/db/translation-queries.ts`
- Modify: `scripts/dictionary/validate-dictionary.ts`
- Modify: `scripts/dictionary/check-seed-status.ts`
- Modify: `prisma/seed.ts`
- Modify: `prisma/data/dictionary/en-vi/entries.json`
- Modify: `prisma/data/dictionary/en-vi/senses.json`
- Modify: `prisma/data/dictionary/en-vi/translations.json`
- Modify: `prisma/data/dictionary/en-vi/aliases.json`
- Modify: `tests/performance/dictionary-flow-benchmark.ts`
- Modify: `tests/performance/translate-flow-benchmark.ts`
- Modify: `tests/performance/query-budget-benchmarks.md`
- Modify: `docs/API/Routes/translation-feature.md`
- Modify: `docs/Flows/dictionary-flow.md`
- Modify: `docs/Flows/translation-flow.md`
- Modify: `docs/database/seed-data.md`

## Implementation Steps

1. Run the dictionary validator and identify seed/import quality failures before touching runtime code.
2. Document and keep the simple seed check rule in `docs/database/seed-data.md`: local source validation everywhere, read-only remote status for local/preview/protected production, mutating seed only by explicit approval.
3. Tighten validation for duplicate aliases, missing primary translations, unsupported language pairs, invalid source labels, and unstable ranks.
4. Preserve route-level behavior from Phase 2 while improving DTO consistency and deterministic ranking.
5. Preserve the Option 1 exact translation cache rule: final successful DTOs only, exact user/source/selection/context/target key, source ownership verified before cache return, and no key normalization or cross-scope cache sharing in this phase.
6. Add benchmark fixtures for any newly stabilized dictionary or translation scenario.
7. Keep hard query budgets for suggest/lookup/entry-detail and document any justified budget changes for search or fallback translation.
8. Update dictionary and translation flow docs after tests and benchmarks define the final behavior.

## Success Criteria

- [x] `pnpm db:validate:dictionary` passes with actionable failures when fixtures are malformed.
- [x] Seed check policy is documented in `docs/database/seed-data.md`, including local/PR CI validation, read-only preview/production status checks, and approval-only mutating seed/import.
- [x] Dictionary route tests pass for exact headword, alias, prefix, contains, entry detail, and miss cases.
- [x] Translation route tests pass for dictionary, phrase, fallback, cache, source-miss, and auth cases.
- [x] `pnpm test:performance` passes current hard query budgets.
- [x] Docs explain the current exact translation cache rule, dictionary/translation boundaries, and deferred cache/search work.

## Risk Assessment

Risk: seed normalization can change visible dictionary ranking. Mitigation: capture current expected ranking in tests before modifying import logic.

Risk: asynchronous translation persistence can mask failures. Mitigation: keep warnings and Sentry capture, and test the user-visible response separately from persistence side effects.
