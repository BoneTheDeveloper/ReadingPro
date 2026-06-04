---
phase: 2
title: "Regression Contracts"
status: pending
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: Regression Contracts

## Overview

Write failing regression tests for stale translation mode callers and every
confirmed legacy request defect before changing production behavior. Replace
invalid database/API fixture IDs with representative UUIDs so tests represent
the normalized schema.

## Requirements

- Functional: prove a mode-less translation request returns the documented
  simple translation shape.
- Functional: prove legacy `mode` fields are rejected instead of silently
  ignored.
- Functional: prove opening the study translation panel reuses the resolved
  translation and does not fire a second `/api/translate` request.
- Functional: prove valid UUID passage IDs reach ownership lookup and malformed
  database identifiers are rejected before domain/database calls.
- Functional: prove malformed JSON and structurally invalid bodies return
  `400`, not `500`.
- Functional: prove invalid input does not call auth/domain dependencies.
- Non-functional: preserve existing success and unexpected-failure coverage.

## Architecture

Test at six boundaries:

1. Translation route behavior in `translation-vocabulary-routes.test.ts`.
2. Study UI behavior in the existing component integration suite.
3. Translation benchmark request fixtures.
4. Query-level validation in `study-session-queries.test.ts`.
5. Legacy HTTP behavior in the consolidated route integration suite.
6. Schema/migration verification from Phase 1.

Keep tests in current files. Do not create a second API-route test harness.

## Related Code Files

- Modify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- Modify: `tests/vitest/integration/components/study/study-page-client.integration.test.tsx`
- Modify: `tests/performance/translate-flow-benchmark.ts`
- Modify: `tests/vitest/fixtures/article.ts`
- Modify: `src/lib/db/study-session-queries.test.ts`
- Modify: `tests/vitest/integration/api/routes.test.ts`
- Review: `tests/vitest/helpers/api.ts`

## Tests Before

- Remove `mode` from valid translation route helpers and benchmark payloads.
- Replace the test named `ignores mode field...` with a regression proving a
  legacy mode field returns `400`.
- Assert valid translation requests still use backend input-shape detection and
  return only `{ translation, type, provider }`.
- Assert the study popup request contains no mode and opening its translation
  panel causes no second translate request or detailed-only rendering.
- Replace non-UUID shared database/API fixture IDs with representative UUIDs.
- Add request-boundary regressions for malformed UUID identifiers in the
  affected route families.
- Add malformed JSON and invalid-body route cases for study-session POST/PATCH,
  text upload, card review, and file upload.
- Assert invalid requests do not invoke auth/domain writes or Sentry capture.

## Implementation Steps

1. Replace stale translation-mode fixtures and tests with mode-less contract
   cases and legacy-mode rejection.
2. Add study component coverage for one request and one simple response shape.
3. Remove mode fields from translation performance benchmark payloads.
4. Update shared database/API fixtures and hard-coded record IDs to valid UUIDs.
5. Extend upload request doubles to model string entries and parse rejection.
6. Replace the malformed text-upload test that expects `500`.
7. Run focused tests and confirm failures describe current defects.

## Regression Gate

```bash
pnpm exec vitest run tests/vitest/integration/api/translation-vocabulary-routes.test.ts tests/vitest/integration/components/study/study-page-client.integration.test.tsx tests/vitest/integration/api/routes.test.ts src/lib/db/study-session-queries.test.ts
```

## Success Criteria

- [ ] Valid translation tests and benchmarks send no `mode`.
- [ ] Legacy translation mode input is rejected with `400`.
- [ ] Study translation panel tests prove no detailed request is fired.
- [ ] Shared database/API fixtures represent UUID production shape.
- [ ] Each confirmed defect has a focused failing regression assertion.
- [ ] Assertions distinguish client `400` failures from server `500` failures.

## Risk Assessment

Removing stale detailed-mode fixtures can expose tests that accidentally depend
on the deleted response shape. Keep the replacement assertions on the documented
simple translation contract. Update IDs that represent persisted records or API
database identifiers; do not rewrite UI-only/result/question-option identifiers.

## Security Considerations

- Preserve source ownership checks for mode-less translation requests.
- Assert invalid bodies are rejected before user-scoped writes.
- Do not include raw request body contents in logs or test expectations.
