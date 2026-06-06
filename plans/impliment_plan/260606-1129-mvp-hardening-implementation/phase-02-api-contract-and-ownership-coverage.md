---
phase: 2
title: "API Contract and Ownership Coverage"
status: pending
priority: P1
effort: "2-3d"
dependencies: [1]
---

# Phase 2: API Contract and Ownership Coverage

## Overview

Lock the public route behavior before deeper feature hardening. This phase expands tests for success envelopes, validation failures, auth failures, ownership misses, and stable error payloads across the documented API surface.

## Requirements

- Functional: every priority route in `docs/Testing/contract-tests.md` has tests for valid input, invalid JSON or schema, missing auth, ownership misses where applicable, and stable error payloads.
- Non-functional: route handlers stay thin, use Zod at boundaries, authenticate before user-owned writes, and return documented status codes.

## Architecture

Routes under `src/app/api/**/route.ts` parse request input, authenticate through `getAuthenticatedUser`, call service/query modules, and return JSON success or error envelopes. Streaming study chat remains the documented success-envelope exception.

## Related Code Files

- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/upload/text/route.ts`
- Modify: `src/app/api/translate/route.ts`
- Modify: `src/app/api/vocabulary/route.ts`
- Modify: `src/app/api/dictionary/lookup/route.ts`
- Modify: `src/app/api/dictionary/search/route.ts`
- Modify: `src/app/api/dictionary/suggest/route.ts`
- Modify: `src/app/api/dictionary/entries/[entryId]/route.ts`
- Modify: `src/app/api/study-chat/route.ts`
- Modify: `src/app/api/cards/due/route.ts`
- Modify: `src/app/api/cards/review/route.ts`
- Modify: `src/app/api/progress/stats/route.ts`
- Modify: `src/app/api/study-session/route.ts`
- Modify: `src/lib/study/shared/study-response-schema.ts`
- Modify: `tests/vitest/integration/api/routes.test.ts`
- Modify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-lookup-route.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-search-route.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-suggest-route.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`
- Create: `tests/vitest/integration/api/upload-routes.test.ts`
- Create: `tests/vitest/integration/api/study-chat-route.test.ts`
- Create: `tests/vitest/integration/api/cards-progress-routes.test.ts`
- Modify: `docs/Testing/contract-tests.md`
- Modify: `docs/API/Routes/response-contract-coverage.md`

## Implementation Steps

1. Build a route coverage matrix from `docs/Testing/contract-tests.md` and current test files.
2. Add missing tests for upload, study chat, cards, progress, and study session routes before modifying route behavior.
3. Normalize auth handling where routes currently collapse auth failures into `500`.
4. Add ownership-miss tests for source/passage/card/session routes that read or mutate user-owned data.
5. Confirm dictionary and translation routes keep their current success shapes and performance envelope exceptions.
6. Update shared response schemas only when a route contract is stable and frontend-facing.
7. Update route docs and response-contract coverage docs after test expectations are fixed.

## Success Criteria

- [ ] Priority routes have contract tests for success, validation, auth, ownership, and unexpected failures where applicable.
- [ ] Auth failures return `401`, validation returns `400`, missing owned resources return `404`, and unexpected failures return stable `{ error }`.
- [ ] Streaming study chat remains documented as a success-shape exception.
- [ ] Route docs and tests agree on request and response shapes.
- [ ] `pnpm run test` passes for the API integration suite.

## Risk Assessment

Risk: normalizing status codes can affect existing clients. Mitigation: lock tests first and update docs in the same phase.

Risk: over-generalized helpers could hide route-specific behavior. Mitigation: keep shared helpers limited to parsing/assertion utilities.
