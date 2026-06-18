---
phase: 1
title: Centralize study route URLs
status: completed
priority: P2
effort: 1-2h
dependencies: []
---

# Phase 1: Centralize study route URLs

## Overview

Route every Study client URL through a single `STUDY_API_ROUTES` map in
`api-utils.ts`, removing scattered string literals. **No URL value changes yet** —
this is a non-breaking DRY refactor that stays green and makes Phase 2 a one-line
flip per route. This is the root-cause fix for the fragmentation (literals were
copy-pasted across hooks, UI, and clients).

## Requirements

- Functional: all study fetches resolve to the exact same URLs as today; behavior
  identical. Test suite stays green throughout the phase.
- Non-functional: zero hardcoded `/api/study-chat|study-session|studio-*` literals
  remain in `src/features/study/**` (production code) after this phase.

## Architecture

`STUDY_API_ROUTES` becomes the single source of truth for study URLs. Routes that
take an id become small builder functions; static routes stay string constants.

```ts
// src/features/study/api-client/api-utils.ts  (current values, unchanged)
export const STUDY_API_ROUTES = {
  chat: "/api/study-chat",
  studySession: "/api/study-session",
  questions: "/api/studio-questions",
  artifacts: "/api/studio-artifacts",
  artifact: (id: string) => `/api/studio-artifacts/${id}`,
  quizResult: (id: string) => `/api/studio-artifacts/${id}/quiz-result`,
} as const;
```

`chat-panel.tsx` consumes `STUDY_API_ROUTES.chat` for both the
`DefaultChatTransport({ api })` value and the manual history fetch (with
`?passageId=` appended). Sentry breadcrumb/tag string literals (`route`, `url.path`)
also reference the constant so they never drift from the real URL.

## Related Code Files

- Modify: `src/features/study/api-client/api-utils.ts` (expand `STUDY_API_ROUTES`)
- Modify: `src/features/study/api-client/studio-artifacts-client.ts` (3 literals → `artifact(id)`, `quizResult(id)`)
- Modify: `src/features/study/ui/study-workspace-client.tsx` (artifacts list fetch → `STUDY_API_ROUTES.artifacts`)
- Modify: `src/features/study/ui/studio/chat/chat-panel.tsx` (4 literals → `STUDY_API_ROUTES.chat`)
- Modify: `src/features/study/hooks/use-study-session-heartbeat.ts` (2 Sentry-tag literals → constant)
- Read for context: `src/features/study/api-client/study-session-client.ts`, `studio-questions-client.ts`, `passages-client.ts` (already use constants / passages stays)

## Implementation Steps

1. Expand `STUDY_API_ROUTES` in `api-utils.ts` with `chat`, `artifacts`,
   `artifact(id)`, `quizResult(id)` (keep `studySession`, `questions`). Keep all
   values at their **current** URLs.
2. Replace the 3 literals in `studio-artifacts-client.ts` with `artifact(id)` /
   `quizResult(id)` builders.
3. Replace the artifacts list `fetch` literal in `study-workspace-client.tsx:285`
   with `STUDY_API_ROUTES.artifacts` (append `?passageId=`).
4. Replace the 4 literals in `chat-panel.tsx` (transport `api`, history `fetch`,
   `url.path` tag, `route` tag) with `STUDY_API_ROUTES.chat`.
5. Replace the 2 Sentry-tag literals in `use-study-session-heartbeat.ts` with
   `STUDY_API_ROUTES.studySession`.
6. `rg "/api/study-chat|/api/study-session|/api/studio-" src/features` → expect
   zero hits outside `api-utils.ts`.
7. `pnpm typecheck && pnpm test` → all green (no URL changed).

## Success Criteria

- [ ] `STUDY_API_ROUTES` covers chat, sessions, questions, artifacts list, artifact-by-id, quiz-result.
- [ ] No study URL string literal remains in `src/features/study/**` except `api-utils.ts`.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes (suite unchanged, still green — behavior identical).

## Risk Assessment

- **Risk:** chat transport `api` option or history fetch subtly differs (query vs
  path). **Mitigation:** keep the exact same resulting URL string; diff before/after
  with the existing chat integration test (`study-chat-panel.integration.test.tsx`).
- **Risk:** missing a literal. **Mitigation:** the `rg` sweep in step 6 is the gate.
