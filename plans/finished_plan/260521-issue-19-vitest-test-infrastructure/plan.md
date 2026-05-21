---
title: "Issue 19 Vitest Test Infrastructure"
description: "Set up Vitest, React Testing Library, coverage, fixtures, mocks, and shared helpers for the English reading training app."
status: completed
priority: P1
effort: 6h
branch: "feature/19-vitest-test-infrastructure"
issue: "https://github.com/BoneTheDeveloper/english-reading-training-app/issues/19"
tags: ["testing", "vitest", "infrastructure", "gkg"]
blockedBy: []
blocks: []
created: "2026-05-21"
createdBy: "ck:cook"
source: skill
---

# Issue 19 Vitest Test Infrastructure

## Overview

Issue #19 asks for a first-class Vitest setup with React Testing Library, jest-dom matchers, jsdom, v8 coverage, shared fixtures, mock modules, and test helpers. The plan keeps the first pass infrastructure-focused: establish reliable test execution and reusable boundaries without adding broad feature test coverage yet.

## GKG Findings

GKG MCP was used to map the codebase before planning. The infrastructure needs to support these existing surfaces:

| Area | Relevant Files | Test Infrastructure Need |
|------|----------------|--------------------------|
| API routes | `src/app/api/cards/*`, `src/app/api/progress/stats`, `src/app/api/study-chat`, `src/app/api/study-session`, `src/app/api/upload*` | Request/response helper utilities, auth mocks, DB mocks, AI stream/generation mocks. |
| Server actions | `src/features/study/actions/*`, `src/features/upload/analyze-content-action.ts` | Mock `next/headers`, Sentry server-action instrumentation, auth, DB, and feature service calls. |
| DB modules | `src/lib/db/client.ts`, `src/lib/db/*-queries.ts` | A reusable Prisma-shaped mock with reset hooks and optional test-data builders. |
| AI modules | `src/lib/ai/content-simplifier.ts`, `src/lib/ai/question-generator.ts`, `src/app/api/study-chat/route.ts` | Mock `ai` and `@ai-sdk/openai` behavior for `generateObject`, `streamText`, and model factories. |
| Logging and observability | `src/lib/core/logger.ts`, files importing `@sentry/nextjs` | Silent logger mocks and Sentry stubs to keep tests deterministic. |
| Supabase/auth | `src/lib/supabase/*`, `src/lib/auth/auth-utils.ts`, auth pages/hooks | Supabase client/server mock factories plus authenticated/unauthenticated user fixtures. |
| React UI | `src/features/*`, `src/components/*` | jsdom environment, React Testing Library setup, jest-dom matchers, and router/i18n mocks. |
| Path aliases | Existing `tsconfig.json` has `@/* -> ./src/*` | Vitest config must mirror the alias so tests import production modules normally. |

## Scope Challenge

- Existing code has no test runner scripts or Vitest config in `package.json`.
- The project uses pnpm, Next 16, React 19, TypeScript strict mode, Prisma 7, Supabase, Sentry, and AI SDK v6.
- The mock layer should be useful immediately, but it should not pretend to be a full in-memory database or Next runtime.
- Selected mode: HOLD SCOPE. This issue sets up infrastructure and smoke validation only. Full unit/integration coverage for each feature should be separate follow-up issues.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Dependencies and Vitest Config](./phase-01-dependencies-and-vitest-config.md) | Completed |
| 2 | [Global Test Setup and Mocks](./phase-02-global-test-setup-and-mocks.md) | Completed |
| 3 | [Fixtures and Helper APIs](./phase-03-fixtures-and-helper-apis.md) | Completed |
| 4 | [Infrastructure Smoke Tests and Verification](./phase-04-smoke-tests-and-verification.md) | Completed |

## Dependencies

- Add dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`, `jsdom`, and `@vitest/coverage-v8`.
- Keep `pnpm` as the package manager and update `pnpm-lock.yaml`.
- Use Vitest globals only if configured consistently in `vitest.config.ts` and setup files.

## Success Criteria

- `pnpm test` runs successfully.
- `pnpm test:coverage` generates a v8 coverage report.
- Test files can import production modules through `@/*`.
- React tests have jest-dom matchers loaded automatically.
- Shared fixtures exist for user, article/passage, and flashcard/card-review style data.
- Shared mocks exist for logger, AI/Gemini-style generation, and DB access.
- Shared helpers exist for DB reset/setup, API request/response patterns, and domain-specific assertions.

## Review Gate

Plan created on 2026-05-21. Implementation completed on 2026-05-21 after `ck:cook` execution.

## Completion Notes

- Added Vitest, React Testing Library, jest-dom, jsdom, React plugin, and v8 coverage dependencies.
- Added `test`, `test:watch`, and `test:coverage` package scripts.
- Added `vitest.config.ts` with jsdom, setup files, React support, coverage, and `@/*` alias resolution.
- Added shared setup, mocks, fixtures, helpers, and smoke tests under `__tests__`.
- Added GitHub Actions CI workflow for install, lint, typecheck, tests, and coverage.
- Added ESLint ignore for generated coverage output.

## Verification

- `pnpm test` passed: 1 file, 5 tests.
- `pnpm test:coverage` passed and generated v8 coverage output.
- `pnpm lint` passed.
- `pnpm exec tsc --noEmit` passed.
