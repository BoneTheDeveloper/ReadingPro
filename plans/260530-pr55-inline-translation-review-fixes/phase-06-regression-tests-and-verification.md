---
phase: 6
title: "Regression Tests and Verification"
status: pending
priority: P1
effort: "4h"
dependencies:
  - 1
  - 3
  - 4
  - 5
---

# Phase 6: Regression Tests and Verification

## Overview

Add focused regression coverage for the manual translate trigger, scope-aware quick translation, and quick-mode PR review findings, then run the repo verification gates.

## Main Info

- Problem: The critical quick-mode behavior now spans UX trigger state, async request timing, selection scope classification, dictionary correctness, non-AI provider routing, result rendering, and seed operations.
- Resolve: Cover the manual trigger and PR fixes with focused tests first, then run typecheck, lint, and the full Vitest suite.

## Requirements

- Functional: Every acceptance criterion in `plan.md` must have automated coverage or browser verification evidence.
- Functional: Existing inline translation and dictionary tests must continue to pass.
- Non-functional: Run typecheck and lint before finalize.
- Non-functional: Do not weaken mocks or remove existing assertions to make tests pass.

## Architecture

Use existing Vitest patterns:

- Resolver unit tests in `src/lib/dictionary/resolve-quick-dictionary-translation.test.ts`.
- Selection-scope helper tests in `src/lib/translation/quick-selection-scope.test.ts`.
- API route tests in `__tests__/api/translation-vocabulary-routes.test.ts` for cache/dictionary/provider routing.
- Study integration tests in `__tests__/components/study/study-page-client.integration.test.tsx`.

## Related Code Files

- Modify/Create: `src/lib/dictionary/*.test.ts`
- Modify/Create: `src/lib/translation/*.test.ts`
- Modify/Create: `__tests__/api/*.test.ts`
- Modify/Create: `__tests__/components/study/*.test.tsx`
- Read: `docs/testing/vitest-infrastructure.md`

## Implementation Steps

1. Run focused tests for the changed units/components first.
2. Run `pnpm run typecheck`.
3. Run `pnpm run lint`.
4. Run `pnpm run test`.
5. If visual positioning cannot be fully asserted in jsdom, run Playwright/browser verification against the Study page if auth/test data are available; otherwise document the blocker and the helper-level coverage used instead.
6. Re-fetch PR #55 review threads and prepare short replies for each fixed thread if the user wants to post them.
7. Update this plan status only after verification passes or any remaining test gap is documented.

## Success Criteria

- [ ] Resolver punctuation regression test passes.
- [ ] Selection-scope classifier tests pass for word, short phrase, sentence, and paragraph inputs.
- [ ] API route tests prove short selections use dictionary resolver after cache miss.
- [ ] API route tests prove sentence/paragraph selections use cache first and non-AI provider on cache miss.
- [ ] API route tests prove sentence/paragraph cache hits do not re-call the non-AI provider.
- [ ] API route tests prove quick mode does not call AI for dictionary or sentence/paragraph selections.
- [ ] Highlighting text does not call `/api/translate`.
- [ ] Clicking the translate icon calls quick `/api/translate`.
- [ ] Sentence selection sends the complete highlighted text in the quick request body.
- [ ] Quick popup does not render Save vocabulary.
- [ ] Quick flow does not call `/api/vocabulary`.
- [ ] Double-click duplicate selection/request regression test passes under the manual-trigger UX.
- [ ] Popup flipped-position behavior is covered by a test or browser verification evidence.
- [ ] `pnpm run typecheck` passes.
- [ ] `pnpm run lint` passes.
- [ ] `pnpm run test` passes, or any failure is unrelated and documented with evidence.

## Risk Assessment

The broad test suite can expose unrelated environmental failures. Separate focused regression failures from pre-existing infrastructure failures and report them clearly.
