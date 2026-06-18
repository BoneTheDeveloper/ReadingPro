---
phase: 2
title: Move study routes (TDD)
status: completed
priority: P1
effort: 2-3h
dependencies:
  - 1
---

# Phase 2: Move study routes (TDD)

## Overview

Move the four Study route groups under `/api/study/*` and flip the centralized
constants to match. TDD: update each route's tests (import path + asserted URL) to
the **target** first → run → red → move the route directory + flip the constant →
green. One route group at a time so red/green stays isolated and bisectable.

## Requirements

- Functional: every moved route responds at its new path with identical behavior,
  status codes, and contracts. Old paths return 404 (acceptable — same-origin app,
  no external consumers).
- Non-functional: no `@/app/api/study-chat|study-session|studio-*` import paths and
  no old URL literals remain anywhere in `src/` or `tests/` after this phase.

## Architecture

Next.js App Router maps directory path → URL. Moving the directory IS the URL change;
no router config. Route-handler tests import the handler by module path
(`@/app/api/.../route`), so those import paths move with the directory. The
`NextRequest(url)` argument in handler tests is read for query params — update it to
the new URL for honesty even though the handler doesn't route on it.

### Directory moves (use `git mv` to preserve history)

| From | To |
|------|----|
| `src/app/api/study-chat/` | `src/app/api/study/chat/` |
| `src/app/api/study-session/` | `src/app/api/study/sessions/` |
| `src/app/api/studio-questions/` | `src/app/api/study/questions/` |
| `src/app/api/studio-artifacts/` | `src/app/api/study/artifacts/` |

`src/app/api/study/passages/` already exists and stays — the moves nest siblings
beside it under `study/`.

### Constant flips (`api-utils.ts`)

```
chat:         /api/study-chat       → /api/study/chat
studySession: /api/study-session    → /api/study/sessions
questions:    /api/studio-questions → /api/study/questions
artifacts:    /api/studio-artifacts → /api/study/artifacts
artifact/quizResult builders        → /api/study/artifacts/${id}[/quiz-result]
```

## Related Code Files

- Move: the four route directories above (`git mv`).
- Modify: `src/features/study/api-client/api-utils.ts` (flip 4 base values; builders follow).
- Modify (test import paths + URL assertions):
  - `tests/vitest/integration/api/study-chat-route.test.ts`
  - `tests/vitest/integration/api/study-session-route.test.ts`
  - `tests/vitest/integration/api/studio-questions-route.test.ts`
  - `tests/vitest/integration/api/routes.test.ts` (study-chat + study-session imports, describe strings, NextRequest URLs)
  - `tests/vitest/integration/components/study/study-chat-panel.integration.test.tsx` (fetch assertions, tags)
  - `tests/vitest/integration/components/study/study-page-client.integration.test.tsx` (`url.startsWith("/api/study-chat"|"/api/studio-artifacts")`)
- Verify only (should need no change — already via constants): `studio-artifacts-client.ts`, `study-session-client.ts`, `studio-questions-client.ts`, `chat-panel.tsx`, `use-study-session-heartbeat.ts`, `use-study-actions.ts`.

## Implementation Steps

Per route group (chat, sessions, questions, artifacts) — repeat the TDD cycle:

1. **Red:** update that route's test file(s) — import path `@/app/api/study/<x>/route`
   and asserted URL `/api/study/<x>`. Run the targeted test → fails (route not moved).
2. **Green:** `git mv` the route directory to its target; flip the matching
   `STUDY_API_ROUTES` value. Re-run the targeted test → passes.
3. Repeat for the next group.

Then global sweeps:

4. Update the component integration tests (`study-chat-panel`, `study-page-client`)
   URL/tag assertions to new paths.
5. `rg "@/app/api/study-chat|@/app/api/study-session|@/app/api/studio-" src tests` → zero hits.
6. `rg "/api/study-chat|/api/study-session|/api/studio-" src tests` → zero hits
   (docs handled in Phase 3).
7. `pnpm typecheck && pnpm lint && pnpm test` → all green.
8. Smoke via `/run` or dev server: open a passage, run chat, generate a quiz, submit
   + reset a quiz result, confirm heartbeat POST — all hit `/api/study/*` (Network tab).

## Success Criteria

- [ ] Four route directories live under `src/app/api/study/` (`chat`, `sessions`, `questions`, `artifacts`).
- [ ] `STUDY_API_ROUTES` values all point at `/api/study/*`.
- [ ] No old import paths or old URL literals remain in `src/` or `tests/`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass.
- [ ] Manual smoke: chat, quiz generation, quiz-result record/reset, session heartbeat work against new URLs.

## Risk Assessment

- **Risk:** `git mv` of a directory with `[id]` dynamic segments mishandled.
  **Mitigation:** move the whole directory tree at once; verify `find src/app/api/study` matches expected layout.
- **Risk:** a missed URL literal causes a silent 404 only at runtime (not caught by
  unit tests). **Mitigation:** step 6 rg sweep + step 8 manual Network-tab smoke of
  every moved route.
- **Risk:** in-flight issue-69 edits to `quiz-result` collide. **Mitigation:** land
  this phase after issue-69 stabilizes; re-run rg sweeps post-rebase.

## Security Considerations

No auth/ownership logic changes — handlers are moved verbatim. Confirm
`getAuthenticatedUser()` and ownership checks remain intact in each moved `route.ts`
(diff should show path-only changes).
