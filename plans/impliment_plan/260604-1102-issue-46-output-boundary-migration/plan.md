---
title: "Issue 46 Output Boundary Migration"
description: "Add shared response DTO schemas, frontend runtime parsing, and complete JSON response contract tests by route family."
status: pending
priority: P2
effort: 12h
issue: 46
branch: "feat/clerk-neon-prisma-vercel-blob-migration"
tags: [api, backend, frontend, refactor]
blockedBy:
  - 260604-1045-issue-46-legacy-input-runtime-fixes
  - 260604-prisma-baseline-rls-dictionary-source-of-truth
  - project:impliment_plan/260604-1806-clerk-neon-prisma-vercel-blob-migration
blocks: []
created: "2026-06-04T04:02:37.382Z"
createdBy: "ck:plan"
source: skill
---

# Issue 46 Output Boundary Migration

## Overview

Deliver Part 2 of GitHub issue #46 after legacy runtime defects are fixed.
Define runtime response contracts for stable frontend-consumed JSON APIs,
validate them in frontend parsing, and make backend route tests parse complete
success/error payloads instead of relying on partial object assertions.

Migration rules:

- Keep domain types as TypeScript types unless data crosses an untrusted runtime
  boundary.
- Define shared Zod response DTO schemas by route family and infer DTO types
  from schemas where practical.
- Frontend callers parse `response.json()` as `unknown`, then validate before
  using data.
- Contract tests validate complete response envelopes for all product JSON
  routes. Optional performance diagnostics are explicit schema branches.
- `POST /api/study-chat` streaming output is excluded from JSON response DTO
  schemas; validate its request and stream protocol separately.
- Do not validate every backend success response at runtime. Frontend parsing
  plus backend contract tests provides coverage without server overhead.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Contract Foundation and Translation Family](./phase-01-contract-foundation-and-translation-family.md) | Pending |
| 2 | [Dictionary Response Contracts](./phase-02-dictionary-response-contracts.md) | Pending |
| 3 | [Remaining Route Families and Verification](./phase-03-remaining-route-families-and-verification.md) | Pending |

## Dependencies

- Blocked by [Issue 46 Legacy Input and Runtime Bug Fixes](../260604-1045-issue-46-legacy-input-runtime-fixes/plan.md).
- API boundary guide: `docs/API/Api-impliment-conventions.md`.
- Existing route tests and helpers under `tests/vitest/integration/api/` and
  `tests/vitest/helpers/`.

## Route Coverage

- Translation family: translate and vocabulary.
- Dictionary family: suggest, search, lookup, and entry detail.
- Study/progress/upload family: cards due/review, progress stats, study session,
  file upload, text upload, and study-chat history GET.
- Explicit exception: study-chat streaming POST.

## Success Criteria

- Every non-streaming product JSON route has complete success/error contract
  tests using shared response schemas.
- Every current browser `response.json()` consumer validates unknown JSON before
  reading route data.
- Shared contracts expose stable API DTOs, not raw Prisma return types.
- Schema failures produce controlled frontend error behavior and useful,
  privacy-safe diagnostics.
