---
phase: 5
title: "Regression Tests Docs and Verification"
status: pending
priority: P1
effort: "2h"
dependencies:
  - 1
  - 2
  - 3
  - 4
---

# Phase 5: Regression Tests Docs and Verification

## Overview

Add focused regression coverage for issue #57 and update docs so future changes preserve the dictionary MVP contract.

## Requirements

- Functional: Tests cover seed hit, alias hit, safe-rule fallback, deterministic fallback, translation cache hit, suggest ranking, empty/short query, stale response guard, duplicate-query cache reuse, and seed validation.
- Functional: Docs describe offline provider/enrichment boundaries, cache strategy, alias strategy, suggest strategy, and seed operation.
- Non-functional: Verification uses existing Vitest, typecheck, lint, and seed-script patterns.

## Architecture

Use existing route tests in `__tests__/api/translation-vocabulary-routes.test.ts` as the main pattern for API behavior. Add focused DB-query tests for ranking, alias resolution, safe-rule fallback, and normalization where mocking Prisma is cheaper than full integration. Add seed fixture validation tests and a small dictionary component test using controlled promises for stale suggest response behavior.

## Related Code Files

- Modify: `/home/luc/Project/english-reading-training-app/__tests__/api/translation-vocabulary-routes.test.ts`
- Create/Modify: `/home/luc/Project/english-reading-training-app/__tests__/api/dictionary-routes.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/normalize-dictionary-term.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/scripts/dictionary/validate-seed.test.ts`
- Create: `/home/luc/Project/english-reading-training-app/__tests__/components/dictionary/dictionary-page-client.integration.test.tsx`
- Modify: `/home/luc/Project/english-reading-training-app/docs/API/translation-flow.md`
- Modify: `/home/luc/Project/english-reading-training-app/docs/database/data-dictionary.md`
- Modify: `/home/luc/Project/english-reading-training-app/docs/testing/manual-test-checklist.md`

## Implementation Steps

1. Add normalization tests for whitespace, case, punctuation stripping, empty output, and phrase preservation.
2. Add lookup tests for exact seeded hit, alias hit, safe-rule fallback, deterministic fallback, and duplicate canonical result prevention.
3. Add seed validation tests for duplicate normalized terms, duplicate aliases, missing translations, missing source/license metadata, invalid confidence, and alias loops.
4. Add quick translate tests for seed hit, alias hit, deterministic fallback, and cache hit.
5. Add suggest tests for exact-first ranking, alias ranking, prefix results, empty/short query behavior, bounded DTO fields, stable ordering, stale-response guard, and duplicate-query cache reuse.
6. Update API/database/manual testing docs with MVP behavior and known out-of-scope growth items.
7. Run verification commands and record failures if environment dependencies block them.

## Success Criteria

- [ ] `pnpm test -- src/lib/dictionary/normalize-dictionary-term.test.ts src/lib/dictionary/resolve-dictionary-lookup.test.ts src/lib/dictionary/resolve-quick-dictionary-translation.test.ts` passes.
- [ ] `pnpm test -- scripts/dictionary/validate-seed.test.ts` passes.
- [ ] `pnpm test -- __tests__/api/dictionary-routes.test.ts __tests__/api/translation-vocabulary-routes.test.ts` passes.
- [ ] `pnpm test -- __tests__/components/dictionary/dictionary-page-client.integration.test.tsx` passes.
- [ ] `pnpm run typecheck` passes.
- [ ] `pnpm run lint` passes.
- [ ] Docs reflect issue #57 MVP boundaries.

## Risk Assessment

The highest test risk is overcoupling to UI internals or offline provider payload details. Assert observable API payloads, visible suggestion text, seed validation failures, alias resolution behavior, and cache writes instead of implementation state.
