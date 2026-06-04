---
phase: 4
title: "Application Authorization Hardening"
status: pending
priority: P1
effort: "8h"
dependencies: [3]
---

# Phase 4: Application Authorization Hardening

## Overview

Make service/repository ownership checks the authoritative security boundary.
Remove user-owned Prisma access from route/page/action adapters, close
check-then-update gaps, and add cross-user regression coverage.

## Context Links

- [Plan](./plan.md)
- [Security model](../../../prisma/SECURITY.md)
- [Passage queries](../../../src/lib/db/passage-queries.ts)
- [Study service](../../../src/features/study/services/passage-study-service.ts)
- [Study chat route](../../../src/app/api/study-chat/route.ts)

## Requirements

- Functional:
  - Every owned operation receives Clerk `userId` from server auth.
  - Every owned read/write/delete filters by direct or indirect ownership.
  - Route handlers, pages, and action adapters do not query owned models directly.
  - User A cannot access or mutate user B data.
- Non-functional:
  - No RLS dependency.
  - Ownership checks remain explicit and reviewable.
  - Avoid check-then-unscoped-mutate time-of-check/time-of-use gaps.

## Architecture

```text
Route/page/action adapter
  -> requireAuthUserId()
  -> service(userId, input)
  -> repository(userId, input)
  -> Prisma query with ownership predicate
```

Existing `src/lib/db/*-queries.ts` modules are accepted as repository
boundaries. Feature services may use Prisma directly only when they own the
authorization decision and all operations remain scoped. Public adapters must
not import `db` for user-owned models.

Indirect ownership:

- `Question` -> owned `Passage`.
- File/blob -> owned `Passage`.
- Study chat -> both `userId` and owned `Passage`.

## File Inventory

| Action | Area/files | Change | Test impact |
|---|---|---|---|
| Modify | `src/lib/db/passage-queries.ts` | Complete scoped create/read/update/delete APIs | Query tests |
| Modify | `src/lib/db/card-review-queries.ts` | Scope update/delete predicates by user | Query tests |
| Modify | `src/lib/db/study-session-queries.ts` | Scope final mutations by user | Query tests |
| Modify | `src/lib/db/translation-queries.ts` | Audit every source/user predicate | Query/service tests |
| Create | `src/lib/db/study-chat-queries.ts` | Move owned chat access from route | Route/service tests |
| Modify | `src/app/api/study-chat/route.ts` | Adapter/orchestration only | Route tests |
| Modify | reading/test pages and study/upload actions | Replace direct owned `db` calls | Integration tests |
| Modify | performance fixture routes | Isolate test-only DB access and ownership | Performance tests |
| Create | `tests/vitest/smoke/authorization-boundaries.test.ts` | Enforce allowed owned-model DB import locations | Smoke |
| Add/modify | repository/service tests | Cross-user denial matrix | Security regression |

## Function Checklist

- [ ] Passage read/list/create/update/delete always requires `userId`.
- [ ] Question mutation verifies parent passage ownership in same service flow.
- [ ] Card review lookup and update remain scoped by `userId`.
- [ ] Study session lookup and update remain scoped by `userId`.
- [ ] Study chat history/create remain scoped by user and passage.
- [ ] Translation/vocabulary raw SQL and Prisma queries include `userId`.
- [ ] Profile deletion is lifecycle-only, never user-request-body driven.
- [ ] Dictionary server-only access stays intentionally unowned/read-only.

## Implementation Steps

1. Inventory every direct Prisma access to owned models and classify:
   repository, authorized feature service, public adapter, or test-only fixture.
2. Add missing repository/service functions before changing callers.
3. Move direct owned queries out of reading/test pages, study upload action, and
   study-chat route.
4. Change mutations to include ownership in final predicate where Prisma allows;
   otherwise perform verified ownership and mutation in a transaction.
5. Audit raw SQL for explicit user predicates and correct text-ID comparisons.
6. Normalize not-found/not-owned behavior so ownership is not disclosed.
7. Add cross-user tests for each owned aggregate.
8. Add a source-boundary smoke test that rejects future direct owned-model
   Prisma access from route/page/action adapters.
9. Update security documentation contract references, leaving final docs cleanup
   to Phase 7.

## Test Scenario Matrix

| Priority | Aggregate/operation | Cross-user expectation |
|---|---|---|
| Critical | Passage read/update/delete | Not found/denied; no mutation |
| Critical | Study chat read/create | Denied when passage belongs to another user |
| Critical | Card review update | Denied; review unchanged |
| Critical | Study session update | Denied; session unchanged |
| Critical | Translation/vocabulary source access | Denied; no cache/history write |
| High | Question regenerate/delete | Denied through parent passage ownership |
| High | Private file lookup | Denied through passage ownership |
| High | Source-boundary architecture test | Fails on new direct adapter DB access |

## Dependency Map

- Requires Phase 3 Clerk auth ID helpers.
- Uses Phase 2 text identity schema.
- Supplies ownership repository needed by Phase 5 private file access.
- Must complete before Phase 7 removes old compatibility/auth files.

## Success Criteria

- [ ] No public route/page/action adapter directly queries user-owned Prisma models.
- [ ] All owned operations require server-derived Clerk `userId`.
- [ ] Cross-user denial tests cover every owned aggregate.
- [ ] Final mutations are ownership-scoped or transactionally protected.
- [ ] Raw SQL remains explicitly user-scoped after text-ID migration.
- [ ] Architecture smoke test prevents regression.

## Risk Assessment

- Risk: indirect Question ownership is missed during bulk writes.
  Mitigation: authorize parent passage before transaction/bulk operation.
- Risk: moving queries changes response shapes/performance.
  Mitigation: preserve current service contracts and run existing route/performance tests.
- Risk: false positives in source-boundary test.
  Mitigation: explicit allowlist for repository/service/test-fixture modules.

## Security Considerations

- Return equivalent not-found/not-owned responses to avoid resource enumeration.
- Log actor ID and operation, not private content.
- Test both reads and writes; read-only checks are insufficient.
