---
phase: 3
title: "Remaining Route Families and Verification"
status: pending
priority: P2
effort: "5h"
dependencies: [2]
---

# Phase 3: Remaining Route Families and Verification

## Overview

Migrate the remaining non-streaming product JSON routes, complete route-contract
coverage, and verify the whole response-boundary migration.

## Requirements

- Functional: shared response schemas cover cards, progress, study sessions,
  uploads, and study-chat history.
- Functional: progress, upload, and study-chat history browser callers parse
  unknown JSON before use.
- Functional: every non-streaming product JSON route has complete contract
  tests for success and stable errors.
- Non-functional: study-chat streaming POST remains an explicit exception.

## Architecture

Group contracts by domain, not HTTP method:

- study/progress schemas for due cards, card review, progress stats, and study
  sessions
- upload schemas for file/text upload results
- study-chat history GET schema; no JSON success schema for streaming POST

Raw Prisma objects must not become stable DTOs by accident. Where current routes
return broad Prisma records, define and map minimal DTOs before locking schemas.

## Related Code Files

- Create/modify: `src/lib/<domain>/shared/*-response-schema.ts` as justified by
  route-family reuse
- Modify: `src/features/progress/progress-dashboard.tsx`
- Modify: `src/features/upload/upload-page-client.tsx`
- Modify: `src/features/study/study-chat-panel.tsx`
- Modify: `tests/vitest/integration/api/routes.test.ts`
- Modify: `tests/vitest/helpers/api.ts`
- Modify if needed: `docs/API/Routes/*.md`
- Review: all 13 product `src/app/api/**/route.ts` files

## Implementation Steps

1. Inventory remaining wire payloads and identify raw Prisma objects requiring
   minimal DTO mapping.
2. Define study/progress, upload, and study-chat history response schemas.
3. Add runtime parsing to current browser consumers with controlled failure
   behavior.
4. Convert consolidated route tests to complete schema-backed assertions.
5. Add a route coverage checklist proving all 13 product routes are classified
   as JSON-contracted or explicit streaming exception.
6. Run focused tests, full suite, typecheck, lint, and diff review.
7. Align API route docs with final stable DTOs and exception rules.

## Verification Gate

```bash
pnpm exec vitest run tests/vitest/integration/api
pnpm run typecheck
pnpm run lint
pnpm run test
```

## Success Criteria

- [ ] Progress, upload, and study-chat history clients validate responses.
- [ ] Cards, progress, sessions, uploads, and chat history have shared schemas.
- [ ] Every non-streaming product JSON route has complete success/error contract
  coverage.
- [ ] Study-chat POST is documented and tested as a streaming exception.
- [ ] Typecheck, lint, and full tests pass or unrelated baselines are recorded.
- [ ] API docs match final wire contracts.

## Risk Assessment

- Schemas can lock accidental Prisma fields as public API. Map minimal DTOs
  before schema creation.
- Broad migration creates review risk. Commit and verify by route family; do
  not mix business changes into this plan.
- Frontend schema failures can become silent. Preserve user-facing error states
  and add privacy-safe diagnostics.

## Security Considerations

- Do not expose ownership fields or internal metadata unless intentional.
- Validate browser data before rendering or routing with response values.
- Never log full response bodies when schema parsing fails.
