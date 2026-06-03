---
phase: 3
title: "Verification"
status: pending
priority: P2
effort: "30m"
dependencies: [2]
---

# Phase 3: Verification

## Overview

Verify the docs are internally consistent and align with the current public API
contracts. This is a docs-only plan, so validation focuses on text consistency
and source evidence.

## Requirements

- Functional: confirm route names, paths, and request fields match code.
- Functional: confirm dictionary and translation docs do not contradict each
  other.
- Non-functional: keep verification lightweight unless implementation changes
  are introduced.

## Architecture

Verification sources:

- `src/app/api/translate/route.ts`
- `src/app/api/dictionary/*/route.ts`
- `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- `tests/vitest/integration/api/dictionary-*.test.ts`
- `docs/API/Api-doc-convention.md`

No test execution is required for a pure docs wording change, but grep checks
should catch stale terminology.

## Related Code Files

- Review: `docs/API/Routes/translation-feature.md`
- Review: `docs/API/Routes/dictionary-feature.md`

## Implementation Steps

1. Search docs for stale/confusing terms:
   - `dictionary route`
   - `Translate API`
   - `single word route`
   - `sentence route`
   - `AI translation`
2. Confirm endpoint headings still follow the six-section API doc convention.
3. Confirm route paths in docs match actual `src/app/api/**/route.ts` paths.
4. Confirm the split answer is explicit:
   - one public inline translation route now
   - two quick resolution paths inside it
   - future split criteria documented
5. If only markdown changed, skip runtime tests and record that decision.
6. If implementation files change during execution, run focused type/test
   verification:
   - `pnpm run typecheck`
   - `pnpm exec vitest tests/vitest/integration/api/translation-vocabulary-routes.test.ts`

## Success Criteria

- [ ] No stale wording implies `/api/translate` is part of `/api/dictionary/*`.
- [ ] No wording implies word and sentence quick translation are separate
  public routes.
- [ ] Contract fields in the docs match current route schema.
- [ ] Verification result is recorded in the final implementation summary.

## Risk Assessment

Risk: docs-only verification can miss a stale implementation reference.

Mitigation: grep both docs and route tests for endpoint paths and contract
terms before finishing.
