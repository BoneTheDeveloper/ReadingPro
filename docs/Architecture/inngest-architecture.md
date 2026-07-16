# Inngest Architecture

## Status

Implemented.

## Overview

Inngest provides durable execution for background jobs — retry-safe, crash-resilient, and observable.

## Vertical Slice Organization

Each feature owns its Inngest code:

```
features/<feature>/server/inngest/
├── events.ts           # Event schemas (*EventSchema)
├── *.ts               # Job functions
└── index.ts           # Re-exports jobs array
```

**Root config:**
```
src/
├── infrastructure/inngest.ts   # Client + job registry
└── app/api/inngest/route.ts   # Serve endpoint
```

## File Structure by Example

### upload feature

```
features/upload/server/inngest/
├── events.ts           # Event schemas + creators
├── process-upload.ts   # Job function
└── index.ts           # export const uploadJobs = [...]
```

### studio-panel feature

```
features/studio-panel/server/inngest/
├── generate-questions.ts   # Job function
└── index.ts               # export const studioPanelJobs = [...]
```

## Client Configuration (v4)

```typescript
// src/infrastructure/inngest.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  signingKeyFallback: process.env.INNGEST_SIGNING_KEY_FALLBACK,
});
```

## Environment Variables

| Variable | Purpose | Local | Production |
|----------|---------|-------|------------|
| `INNGEST_DEV=1` | Enable dev mode | **Required** | N/A |
| `INNGEST_SIGNING_KEY` | Cloud mode auth | N/A | **Required** |
| `INNGEST_EVENT_KEY` | Send events | Optional | Optional |

## Serve Endpoint

```typescript
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest, inngestFunctions } from "@/infrastructure/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});
```

## Event Schemas

```typescript
// features/<feature>/server/inngest/events.ts
import { z } from "zod";

export const MY_EVENT = "app/action" as const;

export const myEventSchema = z.object({
  userId: z.string(),
  itemId: z.string(),
}).strict();

export type MyEventData = z.infer<typeof myEventSchema>;

export function createMyEvent(data: MyEventData) {
  return { name: MY_EVENT, data };
}
```

## Job Functions

```typescript
// features/<feature>/server/inngest/my-job.ts
import { inngest } from "@/infrastructure/inngest";

export const myJob = inngest.createFunction(
  { id: "my-job", triggers: [{ event: "app/action" }] },
  async ({ event, step }) => {
    // All non-deterministic code inside step.run()
    const data = await step.run("process", () => ({
      processed: true,
    }));
    return data;
  }
);
```

## Sending Events from Actions

```typescript
// features/<feature>/server/actions/my-action.ts
"use server";

import { inngest } from "@/infrastructure/inngest";
import { createMyEvent } from "../inngest/events";

export async function myAction(input: MyInput) {
  await inngest.send(createMyEvent({ userId: input.userId, itemId: input.id }));
  revalidatePath("/");
}
```

## Step Best Practices

| Do | Don't |
|----|-------|
| Wrap all DB/API calls in `step.run()` | Put non-deterministic code outside steps |
| Return useful data from steps | Log outside steps (causes duplicates) |
| Reuse step IDs in loops | Change step IDs after deployment |

## Key Files

| File | Purpose |
|------|---------|
| `src/infrastructure/inngest.ts` | Client singleton + job registry |
| `src/app/api/inngest/route.ts` | HTTP endpoint for Inngest |
| `features/*/server/inngest/*.ts` | Feature-owned jobs + events |

## Observability

| Tool | What |
|------|------|
| Inngest Dashboard | Step timing, retries, failures |
| `moduleLog` in services | Feature-specific logs |
| Sentry | Error aggregation |

## Related Docs

- [ai-infrastructure.md](./ai-infrastructure.md) — AI + Inngest layer separation
- [observability.md](./observability.md) — Logging + tracing
