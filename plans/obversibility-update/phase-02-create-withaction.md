---
phase: 2
title: "Create withAction() HOF"
status: completed
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Create withAction() HOF

## Overview

> **STATUS: DONE** — already at `src/lib/observability/with-action.ts` (matches design). Verify only.

Create higher-order function wrapper for server actions that provides scoped logging, Sentry span, and selective error capture.

## Requirements

- Functional: withAction(name, fn) returns wrapped server action
- Non-functional: Request correlation via x-request-id header, lifecycle logging

## Architecture

```typescript
// src/lib/observability/with-action.ts
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { createModuleLogger } from "@/lib/logger";
import { AppError } from "@/lib/logger";

type ActionContext = {
  logger: ReturnType<typeof createModuleLogger>;
  requestId: string;
};

export function withAction<TArgs extends unknown[], TResult>(
  name: string, // "vocabulary.create"
  fn: (ctx: ActionContext, ...args: TArgs) => Promise<TResult>
) {
  return async (...args: TArgs): Promise<TResult> => {
    const requestId =
      (await headers()).get("x-request-id") ?? crypto.randomUUID();
    const logger = createModuleLogger(name).child({ requestId });

    return Sentry.startSpan(
      { name, op: "server.action", attributes: { requestId } },
      async () => {
        logger.info("action.start");
        try {
          const result = await fn({ logger, requestId }, ...args);
          logger.info("action.success");
          return result;
        } catch (error) {
          if (error instanceof AppError && error.isOperational) {
            logger.warn({ err: error }, "action.rejected");
          } else {
            logger.error({ err: error }, "action.error");
            Sentry.captureException(error, {
              tags: { action: name },
              extra: { requestId },
            });
          }
          throw error;
        }
      }
    );
  };
}
```

## Related Code Files

- Create: `src/lib/observability/with-action.ts`
- Read: `src/lib/logger.ts` - for AppError and createModuleLogger

## Implementation Steps

1. Create directory `src/lib/observability/` if not exists
2. Create `src/lib/observability/with-action.ts` with the HOF
3. Verify imports work correctly (AppError, createModuleLogger)
4. Run TypeScript check

## Success Criteria

- [ ] withAction() created at `src/lib/observability/with-action.ts`
- [ ] Can import and use in server actions
- [ ] TypeScript compiles without errors
- [ ] Exports ActionContext type for use in actions
