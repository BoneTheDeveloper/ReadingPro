---
phase: 4
title: "Tests and Documentation"
status: pending
priority: P1
effort: "4h"
dependencies: [2, 3]
---

# Phase 4: Tests and Documentation

## Overview

Lock the fast-only contract with tests, performance budgets, and docs.

## Requirements

- Functional: Tests prove no detailed translate mode remains.
- Functional: Tests prove cache write does not block the returned translation response.
- Functional: Performance benchmark still covers fast translate path.
- Non-functional: Docs match implementation, not legacy behavior.

## Architecture

Tests should cover API schema, route behavior, UI triggers, vocabulary save, dictionary detail, and performance budget. Existing translation route integration tests are the main regression surface.

## Related Code Files

- Modify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- Modify: `src/features/study/*.test.tsx` where relevant
- Modify: `scripts/performance/translate-flow-benchmark.ts`
- Modify: `docs/API/Routes/translation-feature.md`
- Modify: `docs/project-roadmap.md`
- Modify: `docs/project-changelog.md`

## Implementation Steps

1. Update API tests to remove `mode` from valid requests.
2. Add rejection test for legacy `mode: "detailed"` only if strict unknown-key rejection is enabled.
3. Update UI tests for Open Dictionary and Save vocabulary from fast result.
4. Update benchmark payloads to remove `mode`.
5. Add route test proving cache write failure/logging does not turn a resolved translation into a failed response.
6. Run `pnpm run test`, `pnpm run typecheck`, and `pnpm test:performance`.
7. Update docs and changelog after behavior is implemented.

## Success Criteria

- [ ] API tests pass with fast-only request payloads.
- [ ] UI tests prove no detailed AI request is fired from study translate.
- [ ] Cache write is verified as background work, not response-blocking work.
- [ ] Performance benchmark passes current query budgets.
- [ ] Translation flow doc matches shipped behavior.
- [ ] Roadmap/changelog mention detailed AI translation removal.

## Risk Assessment

Risk: Tests may still use old detailed-mode fixtures and hide dead behavior.
Mitigation: Search for `mode: "detailed"`, `DetailedTranslation`, and detailed translation UI strings during verification.
