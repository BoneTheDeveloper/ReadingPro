---
phase: 1
title: "NotFoundError class and toHttp boundary"
status: pending
priority: P2
effort: "1h"
dependencies: []
---

# Phase 1: NotFoundError class and toHttp boundary

## Overview

Introduce the domain error `NotFoundError` and the centralized `toHttp(e, log, route)` mapper in
`src/lib/http/route-errors.ts`. Nothing consumes them yet — this phase only adds the primitives so
later phases have a stable target. Also delete the dead-code auth string branch.

## Requirements

- Functional: `NotFoundError` and `toHttp` exist and compile; no existing behavior changes yet.
- Non-functional: `toHttp` reuses existing `isAuthenticationRequiredError` / `getZodErrorMessage`; lives in the already `server-only` `route-errors.ts`.

## Architecture

`toHttp` is the single boundary translating domain errors → HTTP. It must preserve today's
per-route side effects (logging + Sentry tagging), so it takes the request logger and a route id:

```ts
// src/lib/http/route-errors.ts  (already imports "server-only")
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import type { createRequestLogger } from "@/services/logger";

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found.`);
    this.name = "NotFoundError";
  }
}

export function toHttp(
  e: unknown,
  log: ReturnType<typeof createRequestLogger>,
  route: string,
): NextResponse {
  if (isAuthenticationRequiredError(e)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (e instanceof NotFoundError) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
  if (e instanceof z.ZodError) {
    return NextResponse.json({ error: getZodErrorMessage(e) }, { status: 400 });
  }
  log.error({ err: e }, `${route} failed`);
  Sentry.captureException(e, { tags: { route } });
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}
```

`z` is already imported in the file. `import type { createRequestLogger }` gives the logger type
without a runtime dependency.

## Related Code Files

- Modify: `src/lib/http/route-errors.ts` (add `NotFoundError` + `toHttp`; delete dead auth string branch)

## Implementation Steps

1. Add `NotFoundError` class to `route-errors.ts`.
2. Add `toHttp(e, log, route)` per the sketch above (imports: `NextResponse`, `Sentry`, `type createRequestLogger`).
3. Delete the dead-code branch in `isAuthenticationRequiredError`: remove `|| (error instanceof Error && error.message === "Authentication required")` — the only source of that message is the typed `AuthenticationRequiredError`, already caught by `instanceof` (grep-verified: no plain `throw new Error("Authentication required")` anywhere).
4. `pnpm run typecheck && pnpm run lint`.

## Success Criteria

- [ ] `NotFoundError` and `toHttp` exported from `route-errors.ts`
- [ ] `isAuthenticationRequiredError` no longer has the string-message branch
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] No caller changed yet (this phase is additive + one dead-branch deletion)

## Risk Assessment

Very low. Additive. The only removal (dead auth branch) is grep-verified unreachable. `toHttp` is
unused until Phase 3, so nothing can regress from it here.
