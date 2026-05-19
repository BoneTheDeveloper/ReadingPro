---
title: "Issues #35 and #36 Study Chat AI SDK Completion"
description: "Complete GitHub issues #35 and #36 by replacing the local @ai-sdk/react shim with the real AI SDK React package and finishing the protected study chat streaming route."
status: pending
priority: P2
branch: "feat/issues-35-36-study-chat-ai-sdk"
tags: []
blockedBy: []
blocks: []
created: "2026-05-15T08:55:56.794Z"
createdBy: "ck:plan"
source: skill
---

# Issues #35 and #36 Study Chat AI SDK Completion

## Overview

Implement issues #35 and #36 on `feat/issues-35-36-study-chat-ai-sdk`. The work installs the official `@ai-sdk/react` package, removes the local compatibility shim, wires the Study Chat panel to AI SDK v6 transport APIs, and hardens `POST /api/study-chat` with auth, validation, Sentry, and Pino patterns already used in the app.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Branch and Dependencies](./phase-01-branch-and-dependencies.md) | Pending |
| 2 | [Real useChat Integration](./phase-02-real-usechat-integration.md) | Pending |
| 3 | [Protected Study Chat API](./phase-03-protected-study-chat-api.md) | Pending |
| 4 | [Verification and PR](./phase-04-verification-and-pr.md) | Pending |

## Dependencies

No active unfinished plan dependencies were found in `plans/`. Finished plans under `plans/finished_plan/` remain unchanged.

## Success Criteria

- `@ai-sdk/react` is installed and listed in `package.json` and `pnpm-lock.yaml`.
- No `tsconfig.json` alias maps `@ai-sdk/react` to local source.
- `src/lib/ai-sdk-react.ts` is removed.
- `POST /api/study-chat` validates input, requires auth, returns `401` for unauthenticated users, and streams via the AI SDK v6 UI message stream helper.
- `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` are run and results are recorded in the PR.
