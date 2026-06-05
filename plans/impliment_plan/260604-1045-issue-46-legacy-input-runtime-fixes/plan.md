---
title: "Issue 46 UUID Schema and Legacy Input Runtime Fixes"
description: "Normalize public identifiers to UUID, remove stale translation mode callers, and fix confirmed legacy request-boundary defects."
status: pending
priority: P1
effort: 13h
issue: 46
branch: "feat/clerk-neon-prisma-vercel-blob-migration"
tags: [bugfix, api, backend, frontend, critical]
blockedBy:
  - 260604-1806-clerk-neon-prisma-vercel-blob-migration
blocks: [260604-1102-issue-46-output-boundary-migration]
created: "2026-06-04T03:45:57.125Z"
createdBy: "ck:plan"
source: skill
---

# Issue 46 UUID Schema and Legacy Input Runtime Fixes

## Overview

Deliver Part 1 of GitHub issue #46. Fix current user-visible/runtime defects
before introducing response DTO schemas: normalize application-owned
identifiers to native UUID, align stale study translation callers with the
mode-less translation API, and return stable `400` responses for malformed or
structurally invalid legacy requests.

Design decisions:

- Keep `POST /api/translate` as one strict mode-less request contract. The
  backend auto-detects the word/short-phrase or sentence/paragraph runtime path;
  clients never select a translation mode.
- Remove stale `mode: "quick"` and `mode: "detailed"` callers, tests, and
  benchmarks. Legacy mode fields are invalid request input.
- Keep translation on the current cache-first inline service. Opening the study
  translation panel reuses the already-resolved simple translation and must not
  issue a second detailed-AI translation request.
- Remove unreachable detailed-translation UI/types/AI code where confirmed
  unused. Keep the required legacy database `mode` columns and their internal
  values unchanged; database cleanup is outside this issue.
- Use route-local Zod schemas for legacy JSON request bodies.
- Parse malformed JSON separately from unexpected server failures.
- Use native PostgreSQL UUID columns for application-owned primary keys,
  relation keys, and persisted entity-reference IDs.
- Exception: Clerk supplies `profiles.id`; all owned-table `userId` foreign keys
  are Clerk string IDs after the auth/database migration plan.
- Reset and reseed the development database. Do not preserve current CUID rows
  or add CUID compatibility behavior.
- Validate persisted-record IDs as UUIDs at untrusted request boundaries;
  ownership lookup remains authoritative after structural validation.
- Use an explicit `File` runtime check for multipart upload.
- Preserve current success envelopes. Response DTO schemas and frontend runtime
  response parsing belong to the blocked Part 2 plan.
- Keep auth-status normalization outside this issue.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Public Schema UUID Normalization](./phase-01-uuid-schema-normalization.md) | Pending |
| 2 | [Regression Contracts](./phase-02-regression-contracts.md) | Pending |
| 3 | [Boundary Validation Implementation](./phase-03-boundary-validation-implementation.md) | Pending |
| 4 | [Verification and Documentation](./phase-04-verification-and-documentation.md) | Pending |

## Dependencies

- Blocks [Issue 46 Output Boundary Migration](../260604-1102-issue-46-output-boundary-migration/plan.md).
- Existing API implementation conventions:
  `docs/API/Api-impliment-conventions.md`.
- Existing integration route test harness:
  `tests/vitest/integration/api/routes.test.ts`.
- Development database reset/reseed permission confirmed for this plan.

## Scope

- Fix `POST /api/translate` contract drift by removing stale client-selected
  mode fields and rejecting legacy mode input.
- Remove the stale study detailed-translation fetch and detailed-only response
  expectations.
- Replace stale route, component, and performance fixtures that send translation
  modes.
- Normalize application-owned persisted identifiers from CUID/text to native
  PostgreSQL UUID; preserve Clerk profile/user identity fields as strings.
- Reset and reseed the development database after migration review.
- Align request schemas and fixtures with the UUID identifier contract.
- Fix malformed/invalid input handling for study-session POST/PATCH,
  card-review POST, text-upload POST, and file-upload POST.
- Add focused route, query, and study-component regression tests.
- Align affected API feature docs with final contracts.

## Out Of Scope

- Normalizing missing-auth responses to `401` across legacy routes.
- Refactoring unrelated route handlers into new services/repositories.
- Adding a generic shared request-parsing abstraction.
- Adding response DTO schemas or frontend runtime response parsing.
- Renaming or migrating required legacy translation cache/history database
  `mode` columns.
- Preserving current development CUID data or writing CUID-to-UUID conversion.
- Changing ownership semantics or cascade behavior beyond the blocking
  Clerk/Neon migration plan.
- Adding dictionary lookup/search behavior to the study translation panel.

## Success Criteria

- Valid mode-less translation requests return the documented simple translation
  shape through backend auto-detection.
- Study translation callers send no `mode`, and opening the translation panel
  causes no second `/api/translate` request.
- Legacy translation mode input is rejected with `400`; no detailed AI
  translation path remains reachable from study translation.
- Every application-owned PK/FK/entity-reference identifier is native
  PostgreSQL UUID, Clerk identity fields are strings, and no persisted
  application record uses CUID.
- Development reset, migration replay, Prisma generation, dictionary reseed,
  and dictionary validation succeed.
- Valid UUID passage IDs create study sessions after ownership checks; malformed
  UUIDs are rejected before domain/database calls.
- Every affected malformed/invalid client request returns stable `400`.
- Invalid input never invokes auth-dependent/domain write functions.
- Expected client errors are not captured as unexpected Sentry exceptions.
- Existing valid request and unexpected-failure behavior remains covered.
