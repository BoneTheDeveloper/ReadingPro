---
phase: 4
title: "Verification and Documentation"
status: completed
priority: P2
effort: "2h"
dependencies: [3]
---

# Phase 4: Verification and Documentation

## Overview

Run focused and repository-level verification, then align API feature docs with
the corrected mode-less translation and request-validation contracts.

## Requirements

- Functional: all Part 1 route/query/component regressions pass.
- Non-functional: typecheck, lint, and full Vitest suite remain green.
- Documentation: the mode-less translation contract and affected `400`/`500`
  behavior are exact.

## Related Code Files

- Modify: `docs/API/Routes/translation-feature.md`
- Modify if needed: `docs/API/Routes/study-session-feature.md`
- Modify if needed: `docs/API/Routes/study-chat-feature.md`
- Modify if needed: `docs/API/Routes/dictionary-feature.md`
- Modify if needed: `docs/API/Routes/upload-feature.md`
- Modify: `docs/database/erd.md`
- Modify: `docs/database/data-dictionary.md`
- Review: `docs/API/Api-impliment-conventions.md`
- Review: `docs/code-standards.md`

## Refactor

- Verify translation docs describe one mode-less API, backend input-shape
  detection, and the simple response shape.
- Remove stale quick/detailed mode wording from affected tests, UI copy, and
  documentation where encountered in the touched surface.
- Document malformed/invalid study-session, card-review, JSON upload, and
  multipart upload `400` behavior.
- Document native UUID primary/foreign key conventions and the dev reset/reseed
  workflow.
- Keep response-schema migration and auth normalization out of Part 1.

## Verification Gate

```bash
pnpm exec vitest run tests/vitest/integration/api/translation-vocabulary-routes.test.ts tests/vitest/integration/components/study/study-page-client.integration.test.tsx tests/vitest/integration/api/routes.test.ts src/lib/db/study-session-queries.test.ts src/lib/validation/upload.test.ts
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm test:performance
```

## Implementation Steps

1. Run focused route/query/component tests.
2. Run typecheck, lint, full Vitest suite, and the translation performance
   benchmark.
3. Verify the translation feature doc remains authoritative and update affected
   legacy API docs.
4. Review diff for accidental output-contract, auth, or unrelated refactors.
5. Record exact evidence for any unrelated baseline failure.

## Success Criteria

- [x] Focused regressions pass.
- [x] Typecheck, lint, full tests, plain-PostgreSQL migration replay, and seed
  validation pass or unrelated baselines are recorded.
- [x] Translation docs, tests, benchmarks, and study callers contain no
  client-selected translation mode contract.
- [x] API docs match corrected malformed/invalid input behavior.
- [x] Diff contains no response-schema migration or auth normalization.

## Risk Assessment

UUID fixture changes may reveal tests that use readable fake IDs for persisted
records. Update database/API boundary fixtures, but leave UI-only identifiers
alone unless they cross a UUID-validated boundary.

## Security Considerations

- Verify invalid client input is not captured as an operational server error.
- Verify logs and docs do not expose sensitive request contents.
