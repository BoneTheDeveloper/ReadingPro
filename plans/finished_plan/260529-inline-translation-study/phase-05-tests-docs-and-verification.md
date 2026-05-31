---
phase: 5
title: Tests Docs and Verification
status: completed
priority: P1
effort: 4h
dependencies:
  - 1
  - 2
  - 3
  - 4
  - 6
  - 7
---

# Phase 5: Tests Docs and Verification

## Overview

Add focused tests for API contracts, persistence behavior, and Study UI translation flow, then verify the full changed surface with typecheck, lint, and tests.

## Requirements

- Functional: Cover success and failure paths for translation and vocabulary APIs.
- Functional: Cover seeded dictionary hits, contextual dictionary behavior, ranked candidate selection, deterministic quick fallback generation, detailed AI fallback, and exact cache hits.
- Functional: Cover quick popup, detail panel, save, and stale-selection clearing behavior.
- Functional: Cover v1 boundaries: no right-click menu, no history viewer, no automatic Ask AI send.
- Functional: Cover required Sentry/Pino instrumentation for new server and client flows.
- Non-functional: Preserve existing Study workspace tests and API route tests.
- Non-functional: Update docs if API or database contracts change.

## Architecture

Extend existing Vitest patterns:

- API route coverage in `__tests__/api/routes.test.ts` or a focused translation route test file.
- DB helper coverage beside `src/lib/db/*`.
- Study workspace coverage in `__tests__/components/study/study-page-client.integration.test.tsx`.
- Observability assertions should use existing Sentry and logger mocks where practical, focusing on required span/breadcrumb/log calls and privacy-safe metadata.
- Documentation updates in `docs/API/` and `docs/database/` only where they clarify new public behavior.

Deterministic test passage:

```txt
Key concerns include algorithmic bias in automated hiring systems.
The algorithm can amplify bias when training data is incomplete.
Researchers use evidence to audit the model.
The passage also mentions quorvex drift, a term outside the seed dictionary.
```

Required dictionary/API scenarios:

| Selection | Context | Expected path | Expected result |
|-----------|---------|---------------|-----------------|
| `algorithmic bias` | first sentence | dictionary hit | `thiên lệch thuật toán`, no AI call |
| `algorithm` | second sentence | dictionary hit | `thuật toán`, no AI call |
| `bias` | first sentence | contextual dictionary hit | `thiên lệch thuật toán`, no AI call |
| `data` | second sentence | dictionary hit | `dữ liệu`, no AI call |
| `quorvex drift` | fourth sentence | quick deterministic fallback | fallback result, no AI call, then cache write |
| repeat `quorvex drift` | same fourth sentence | exact cache hit | cached result, no dictionary/AI call |

## Related Code Files

- Modify/Create: tests under `__tests__/api`, `__tests__/components/study`, and/or `src/lib/db/*.test.ts`
- Modify: `docs/API/overview.md` or create `docs/API/translation-flow.md`
- Modify: `docs/database/data-dictionary.md` and `docs/database/erd.md` if schema changes are implemented
- Modify: `docs/codebase-summary.md` if new modules are added

## Implementation Steps

1. Add API tests for `/api/translate`: invalid JSON, invalid body, auth failure, missing source, cache hit, quick cache miss fallback, and detailed AI failure.
2. Add API tests using the deterministic passage above for dictionary hit, contextual dictionary hit, ranked lookup, quick deterministic fallback, detailed AI fallback, and exact cache hit.
3. Add API tests for `/api/vocabulary`: invalid body, missing source, successful save, duplicate save/upsert.
4. Add API observability tests or assertions for request logger creation, Sentry spans, warning logs on invalid input, and exception capture on unexpected failures.
5. Add component tests for selection popup and Translate panel using mocked fetch responses.
6. Add UI observability assertions for breadcrumbs on selection, quick/detailed translation lifecycle, save, and Ask AI.
7. Preserve and rerun existing Study workspace tests.
8. Update API/database docs with the final implemented contracts, seeded dictionary behavior, and observability expectations.
9. Run verification commands and fix failures:
   - `pnpm run typecheck`
   - `pnpm run lint`
   - `pnpm run test`
   - Playwright only if real browser selection cannot be validated with component tests.

## Success Criteria

- [x] All new acceptance criteria from `plan.md` are covered by tests or an explicit manual verification note.
- [x] Seeded dictionary tests prove all quick-mode paths avoid AI calls, including unknown-term fallback generation.
- [x] Cache tests prove repeating the same unknown selection returns cached output without dictionary/AI calls.
- [x] Existing API, Study, Chat, Quiz, Summary, and upload tests still pass.
- [x] Typecheck and lint pass.
- [x] Documentation reflects any new API endpoints and database tables.
- [x] Docs clearly list incoming tasks after v1 rather than implementing them.
- [x] Tests verify the new flows use Sentry/Pino without logging raw selected text or context.
- [x] No unrelated files, plans, or generated artifacts are modified.

## Risk Assessment

The test suite already mocks several route dependencies. Keep mocks narrow and update them only for the new translation dependencies to avoid weakening existing route coverage.
