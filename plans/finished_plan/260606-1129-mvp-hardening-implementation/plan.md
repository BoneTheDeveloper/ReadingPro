---
title: MVP Hardening Implementation
description: >-
  Implementation plan for the current MVP-hardening scope: production
  verification, API contracts, dictionary and translation stability, study chat
  polish, learning-loop progress, and release gates.
status: in-progress
priority: P2
branch: feature/63-stabilize-study-workspace-entry-source-selection
tags:
  - mvp-hardening
  - contracts
  - production
  - dictionary
  - translation
  - study-chat
  - progress
blockedBy: []
blocks: []
created: '2026-06-06T04:28:59.296Z'
createdBy: 'ck:plan'
source: skill
---

# MVP Hardening Implementation

## Overview

This plan converts the active product scope and roadmap into implementation phases for MVP hardening. The scope source is `docs/Product/feature-scope.md` plus `docs/project-roadmap.md`, which say the app already has the core MVP and now needs production verification, route/ownership contract coverage, dictionary seed and benchmark stability, paragraph translation and vocabulary polish, study chat state hardening, and deeper progress analytics.

Discovery used direct file reads plus GKG MCP definition search. GKG located the relevant definitions and route handlers for `getAuthenticatedUser`, `POST`/`GET` route handlers, `executeTranslate`, dictionary `handle*Get` flows, `saveVocabularyItem`, `getUserProgress`, `getDueCards`, and `updateCardReview`. GKG reference lookup returned incomplete results for some exported helpers, so this plan treats GKG as a graph hint and verifies file impact by reading the concrete routes, services, tests, and docs.

`docs/development-rules.md` is not present in this repository. The applicable local standards for this plan are `AGENT.md`, `docs/code-standards.md`, `docs/Testing/testing-strategy.md`, and the route-specific docs under `docs/API/Routes/`.

## Scope

In scope:
- Verify production environment contracts for Clerk, Neon, Vercel Blob, Sentry, and Vercel deploys.
- Expand API contract tests for auth, validation, ownership, success envelopes, and stable error envelopes.
- Stabilize dictionary seed/import quality and preserve dictionary and translation query budgets.
- Harden study chat history, streaming, retry/error states, and persistence behavior.
- Implement vocabulary data model from ADR 0005: two-table VocabularyItem + VocabularyOccurrence, vocabulary sets (MANUAL/DAILY/WEEKLY), save from translate and dictionary, vocabulary page UI.
- Add progress analytics needed for MVP release confidence and release verification.

Out of scope:
- Billing, classroom/team flows, native mobile, OCR, YouTube transcription, audio pronunciation, offline sync.
- Multi-target-language dictionary support beyond current `en` to `vi` contracts.
- Redis/server memory caches for dictionary or translation.
- Study chat mode switching unless a separate state model is designed first.
- Full SM-2 integration for vocabulary review (deferred to post-MVP).
- SOURCE vocabulary set type (deferred).
- Vocabulary import/export, shared/public sets.

## Related Code Surface

GKG and file reads mark these as the main implementation surface:
- Runtime/API: `src/app/api/upload/route.ts`, `src/app/api/upload/text/route.ts`, `src/app/api/translate/route.ts`, `src/app/api/vocabulary/route.ts`, `src/app/api/vocabulary/**/route.ts` (new), `src/app/api/dictionary/**/route.ts`, `src/app/api/study-chat/route.ts`, `src/app/api/cards/**/route.ts`, `src/app/api/progress/stats/route.ts`, `src/app/api/study-session/route.ts`.
- Auth/data/storage: `src/lib/auth/auth-utils.ts`, `src/lib/auth/sync-user.ts`, `src/lib/db/client.ts`, `src/lib/db/translation-queries.ts`, `src/lib/db/vocabulary-queries.ts` (new), `src/lib/db/vocabulary-set-queries.ts` (new), `src/lib/db/card-review-queries.ts`, `src/lib/db/study-session-queries.ts`, `src/lib/storage/blob-storage.ts`, `prisma/schema.prisma`.
- Dictionary/translation: `src/lib/dictionary/**`, `src/lib/translation/**`, `scripts/dictionary/**`, `prisma/seed.ts`, `prisma/data/dictionary/en-vi/**`.
- Study/progress UI: `src/features/study/study-chat-panel.tsx`, `src/features/study/study-right-panel.tsx`, `src/features/vocabulary/**` (new), `src/features/progress/progress-dashboard.tsx`, `src/lib/study/shared/study-response-schema.ts`.
- Tests/performance: `tests/vitest/integration/api/**`, `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx`, `tests/vitest/integration/components/progress/progress-dashboard.integration.test.tsx`, `tests/performance/**`, `playwright/tests/**`.
- Docs/operations: `docs/Operations/**`, `docs/API/**`, `docs/Flows/**`, `docs/Testing/**`, `docs/ADR/0005-vocabulary-review-mvp-path.md`, `.env.example`, `vercel.json`.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Production Environment Verification](./phase-01-production-environment-verification.md) | Completed |
| 2 | [API Contract and Ownership Coverage](./phase-02-api-contract-and-ownership-coverage.md) | Completed |
| 3 | [Dictionary and Translation Stability](./phase-03-dictionary-and-translation-stability.md) | Completed |
| 4 | [Study Chat and Learning Loop Polish](./phase-04-study-chat-and-learning-loop-polish.md) | Pending |
| 5 | [Progress Analytics and Release Verification](./phase-05-progress-analytics-and-release-verification.md) | Pending |

## Dependencies

No unfinished same-scope project plans were found during the pre-creation scan. Historical finished plans under `plans/finished_plan/` are reference material only.

Phase dependencies:
- Phase 2 depends on Phase 1 enough to know which environment-sensitive auth/storage cases must be contract tested.
- Phase 3 depends on Phase 2 route-contract baselines to avoid changing response shapes while tuning query behavior.
- Phase 4 depends on Phase 2 for study chat contract coverage.
- Phase 5 depends on Phases 2 through 4 for reliable analytics and release gates.

## Success Criteria

- [ ] Production verification docs and scripts cover Clerk, Neon, Blob, Sentry, Vercel, migrations, and smoke flows.
- [x] Priority API routes have contract tests for valid requests, invalid JSON/schema, missing auth, ownership misses, and stable error envelopes.
- [ ] Dictionary and translation performance budgets remain documented and pass with current benchmark fixtures.
- [ ] Study chat has robust history load, stream, stop, retry, empty, and failure states with matching route tests.
- [ ] Vocabulary data model (ADR 0005) is migrated: VocabularyItem + VocabularyOccurrence two-table model, VocabularySet with MANUAL/DAILY/WEEKLY types, save from translate and dictionary, dedup by normalized text + translation.
- [ ] Vocabulary page renders items with status badges, source badges, savedCount, occurrences, and set grouping.
- [ ] Progress analytics show correct review/card/session aggregates and pass release verification.

## Verification Commands

Run the smallest relevant subset during each phase, then the full release gate in Phase 5:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run test:performance
pnpm build
pnpm e2e
```
