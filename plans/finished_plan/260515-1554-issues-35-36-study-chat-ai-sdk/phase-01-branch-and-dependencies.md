---
phase: 1
title: "Branch and Dependencies"
status: pending
priority: P1
effort: "30m"
dependencies: []
---

# Phase 1: Branch and Dependencies

## Overview

Create the correct feature branch, install the official AI SDK React package, and remove the temporary local shim and TypeScript path alias.

## Requirements

- Functional: `@ai-sdk/react` must resolve from `node_modules`, not from `src/lib/ai-sdk-react.ts`.
- Non-functional: Keep dependency changes limited to the AI SDK React package and generated lockfile updates.

## Architecture

The Study Chat UI should use the official AI SDK v6 React hook. The prior local shim was only a package-fetch workaround and should not remain in source or TypeScript resolution.

## Related Code Files

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`
- Delete: `src/lib/ai-sdk-react.ts`

## Implementation Steps

1. Create or confirm branch `feat/issues-35-36-study-chat-ai-sdk` from `main`.
2. Install `@ai-sdk/react` with pnpm.
3. Remove the `@ai-sdk/react` path alias from `tsconfig.json`.
4. Delete `src/lib/ai-sdk-react.ts`.

## Success Criteria

- [ ] Feature branch exists and is based on `main`.
- [ ] `package.json` and `pnpm-lock.yaml` include `@ai-sdk/react`.
- [ ] `tsconfig.json` only keeps the normal `@/*` alias.
- [ ] Local shim file is gone.

## Risk Assessment

Installing the newest compatible package may expose small API differences in `useChat`; mitigate by checking local type definitions and using the documented v6 `DefaultChatTransport` shape.
