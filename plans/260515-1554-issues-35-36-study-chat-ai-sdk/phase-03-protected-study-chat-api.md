---
phase: 3
title: "Protected Study Chat API"
status: pending
priority: P1
effort: "1h"
dependencies: ["phase-02-real-usechat-integration"]
---

# Phase 3: Protected Study Chat API

## Overview

Finish `POST /api/study-chat` so it follows existing API route patterns for authentication, validation, logging, Sentry instrumentation, and AI SDK v6 streaming.

## Requirements

- Functional: Authenticated users receive passage-grounded streaming tutor responses.
- Functional: Unauthenticated users receive `401`; invalid request bodies receive `400`.
- Non-functional: Errors are logged through Pino and captured by Sentry with route/method tags.

## Architecture

The route validates the UI message payload plus passage context, authenticates with `getAuthenticatedUser()`, calls `streamText` using `openai("gpt-4o-mini")`, converts UI messages with `convertToModelMessages`, and returns `toUIMessageStreamResponse()`. The issue's `toDataStreamResponse()` wording is treated as stale for this repo's AI SDK v6 type surface.

## Related Code Files

- Modify: `src/app/api/study-chat/route.ts`

## Implementation Steps

1. Switch to `NextRequest` and `NextResponse` for consistency with nearby routes.
2. Import `* as Sentry` and `getAuthenticatedUser`.
3. Parse JSON safely and validate with Zod.
4. Authenticate before streaming and map auth failures to `401`.
5. Wrap AI generation in `Sentry.startSpan` and log/capture exceptions.
6. Return `result.toUIMessageStreamResponse()`.

## Success Criteria

- [ ] Authenticated valid requests stream.
- [ ] Unauthenticated requests return `401`.
- [ ] Invalid requests return `400`.
- [ ] Runtime errors are logged and sent to Sentry.
- [ ] TypeScript accepts the AI SDK v6 stream helper.

## Risk Assessment

`getAuthenticatedUser()` currently throws a generic auth error. Mitigate by only mapping the known `Authentication required` message to `401` and preserving `500` for unexpected failures.
