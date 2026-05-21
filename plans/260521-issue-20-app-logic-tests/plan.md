---
title: "Issue 20 App Logic Tests"
description: "Add Vitest coverage for non-UI application logic: utilities, hooks, API routes, server actions, services, and observability behavior."
status: planned
priority: P1
effort: 10h
branch: "feature/issue-20-app-logic-tests"
issue: "https://github.com/BoneTheDeveloper/english-reading-training-app/issues/20"
tags: ["testing", "vitest", "app-logic", "gkg"]
blockedBy: []
blocks: []
created: "2026-05-21"
createdBy: "ck:cook"
source: skill
---

# Issue 20 App Logic Tests

## Overview

Issue #20 asks for tests across all non-UI application logic. The current branch is `feature/issue-20-app-logic-tests`, and issue #19 already delivered Vitest infrastructure, shared setup, mocks, fixtures, helpers, and smoke tests. This plan builds on that foundation without changing runtime behavior.

## Issue Scope

- Utility tests for reading helpers, CEFR helpers, SM2 scheduling, validation, auth redirects, AI prompt wrapping, and DB query helpers.
- Hook tests for custom hooks using `renderHook` and `act`.
- API route tests for cards, progress, study session, study chat, upload, and upload text routes.
- Server action and service tests for study/upload workflows.
- Sentry/logger tests for capture behavior, server action instrumentation, config filtering, environment behavior, and graceful degradation.
- Coverage target: 80%+ line coverage on core modules included in this plan.

## GKG Findings

GKG MCP was used to map `src/lib`, `src/features`, `src/app/api`, and `__tests__`.

| Area | Relevant Files | Existing Test Infrastructure To Use |
|------|----------------|-------------------------------------|
| Test setup | `vitest.config.ts`, `__tests__/setup/vitest.setup.ts` | jsdom, React plugin, `@/*` alias, jest-dom, global mocks, cleanup/reset hooks. |
| Mocks | `__tests__/mocks/db.ts`, `ai.ts`, `openai.ts`, `supabase.ts`, `logger.ts` | Prisma-shaped DB mocks, AI SDK mocks, Supabase mocks, silent logger mock, Sentry mock from setup. |
| Fixtures | `__tests__/fixtures/user.ts`, `article.ts`, `flashcard.ts` | User/profile, passage, generated question, card review, due card, study session fixtures. |
| Helpers | `__tests__/helpers/api.ts`, `db.ts`, `assertions.ts` | NextRequest builders, response JSON helpers, DB seed/reset helpers, domain shape assertions. |
| Utilities | `src/lib/shared/reading-utils.ts`, `src/lib/domain/cefr.ts`, `src/lib/algorithms/sm2.ts`, `src/lib/validation/upload.ts`, `src/lib/auth/redirects.ts`, `src/lib/ai/prompt-utils.ts` | Pure unit tests, edge cases, date control where relevant. |
| DB query logic | `src/lib/db/card-review-queries.ts`, `passage-queries.ts`, `study-session-queries.ts`, `auth/sync-user.ts`, `auth/auth-cache.ts` | DB mock assertions, happy/error paths, input validation, query shape checks. |
| Hooks | `src/features/study/use-study-actions.ts`, `use-study-workspace-state.ts`, `use-study-panel-layout.ts`, `src/components/layout/use-sign-out.ts` | React Testing Library `renderHook`, mocked router/i18n, mocked server actions. |
| Services/actions | `src/features/upload/content-analysis-service.ts`, `upload-workflow.ts`, `analyze-content-action.ts`, `src/features/study/services/passage-study-service.ts`, `src/features/study/actions/*` | AI/DB/storage/auth/Sentry mocks; action result assertions. |
| API routes | `src/app/api/cards/due/route.ts`, `cards/review/route.ts`, `progress/stats/route.ts`, `study-session/route.ts`, `study-chat/route.ts`, `upload/route.ts`, `upload/text/route.ts` | NextRequest helpers, response helpers, auth/DB/AI mocks, error payload assertions. |
| Observability | `src/lib/core/sentry.ts`, `src/lib/core/logger.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation*.ts`, `src/app/api/sentry-example-api/route.ts` | Sentry mock assertions, module isolation for env-dependent config. |

## Testing Strategy

- Prefer colocated tests next to production modules for narrowly scoped utility/hook/service logic.
- Use `__tests__/api/` for route-handler tests where the helper layer already lives outside `src`.
- Keep UI component rendering out of scope except where required to exercise hooks.
- Mock external boundaries only: database, Supabase storage/auth, AI providers, Sentry, Next router/headers.
- Use deterministic dates where SM2, streaks, sessions, cache expiry, or progress stats depend on time.
- Preserve the existing shared fixtures and add only small fixture builders when repeated setup becomes noisy.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Utility and Pure Logic Tests](./phase-01-utility-and-pure-logic-tests.md) | Planned |
| 2 | [Hook Tests](./phase-02-hook-tests.md) | Planned |
| 3 | [Services and Server Actions Tests](./phase-03-services-and-server-actions-tests.md) | Planned |
| 4 | [API Route Tests](./phase-04-api-route-tests.md) | Planned |
| 5 | [Sentry, Coverage, and Verification](./phase-05-sentry-coverage-and-verification.md) | Planned |

## Acceptance Criteria Mapping

- All utility functions tested: phases 1 and 5.
- All hooks tested with `renderHook` and `act`: phase 2.
- All API routes and server actions tested: phases 3 and 4.
- Sentry integration verified with mocks: phases 3, 4, and 5.
- Shared fixtures and mocks used throughout: all phases.
- External dependencies mocked: all phases touching DB, AI, Supabase, Sentry, or Next runtime.
- Happy paths, error cases, and edge cases covered: every phase file calls these out explicitly.
- 80%+ line coverage on core modules: phase 5 verifies with `pnpm test:coverage`.

## Review Gate

Plan created on 2026-05-21. Implementation must wait for plan review/approval per `ck:cook` hard gate.

