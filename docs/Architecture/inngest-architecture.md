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
├── infrastructure/inngest/
│   ├── index.ts     # Barrel: exports client + functions
│   ├── client.ts   # Inngest client singleton
│   └── registry.ts # Job registry
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
// src/infrastructure/inngest/client.ts
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

## Job Lifecycle

### 1. Trigger (How a job starts)

**Event-driven:** Job triggers when an event is sent via `inngest.send()`.

```
Client → Server Action → inngest.send(event) → Inngest Queue → Worker executes job
```

**Cron-triggered:** Job runs on a schedule.

```typescript
export const scheduledJob = inngest.createFunction(
  {
    id: "daily-cleanup",
    triggers: [{ cron: "0 2 * * *" }], // Daily at 2 AM
  },
  async ({ step }) => { /* ... */ }
);
```

### 2. Execution (Steps)

Each step is retried independently. Use `step.run()` for all side effects:

```typescript
export const myJob = inngest.createFunction(
  { id: "my-job", triggers: [{ event: "app/action" }] },
  async ({ event, step }) => {
    // Step 1: Fetch data
    const data = await step.run("fetch-data", () => fetchData(event.data.id));

    // Step 2: Process (deterministic, but still in step for memoization)
    const processed = await step.run("process", () => processData(data));

    // Step 3: Save
    await step.run("save", () => db.save(processed));

    return { processed: true };
  }
);
```

### 3. Success (Job completes)

Job succeeds when function returns. Return data is stored.

```typescript
return { artifactId: artifact.id, questionCount };
```

Inngest automatically:
- Marks run as completed
- Stores return value
- Stops retries

### 4. Failure & Retries (Automatic)

**Default:** 5 attempts per step (1 initial + 4 retries with exponential backoff).

```typescript
// Customize retries
export const myJob = inngest.createFunction(
  { id: "my-job", retries: 10 }, // More retries
  async ({ event, step }) => { /* ... */ }
);
```

### 5. Non-Retriable Errors (Fatal)

Use `NonRetriableError` for failures that won't succeed on retry:

```typescript
import { NonRetriableError } from "inngest";

export const myJob = inngest.createFunction(
  { id: "my-job", triggers: [{ event: "app/action" }] },
  async ({ event, step }) => {
    const data = await step.run("fetch", () => {
      const result = fetchData(event.data.id);
      if (!result) {
        throw new NonRetriableError("Data not found - won't retry");
      }
      return result;
    });
    // ...
  }
);
```

### 6. Idempotency (Prevent duplicate work)

**Event-level:** Use custom `id` on `inngest.send()` for 24-hour dedupe.

```typescript
await inngest.send({
  id: `upload-${jobId}`, // Same jobId = same event = no duplicate
  name: "upload/process",
  data: { jobId, userId, ... },
});
```

**Function-level:** Prevent function from running twice.

```typescript
export const myJob = inngest.createFunction(
  {
    id: "my-job",
    triggers: [{ event: "app/action" }],
    idempotency: "event.data.jobId", // Run once per jobId
  },
  async ({ event, step }) => { /* ... */ }
);
```

### 7. Fallback / Error Recovery

**Try-catch with fallback step:**

```typescript
export const myJob = inngest.createFunction(
  { id: "my-job", triggers: [{ event: "app/action" }] },
  async ({ event, step }) => {
    let result;
    try {
      result = await step.run("primary", () => callPrimaryService(event.data));
    } catch {
      // Fallback to secondary service
      result = await step.run("fallback", () => callSecondaryService(event.data));
    }
    return { result };
  }
);
```

**Update job status to FAILED:**

```typescript
await step.run("mark-failed", () =>
  prisma.uploadJob.update({
    where: { id: event.data.jobId },
    data: { status: "FAILED" },
  })
);
```

### 8. Cancellation (Undo / Stop mid-job)

**Cancel on specific event:**

```typescript
export const myJob = inngest.createFunction(
  {
    id: "my-job",
    triggers: [{ event: "order/created" }],
    cancelOn: [
      { event: "order/cancelled", if: "event.data.orderId == async.data.orderId" },
    ],
  },
  async ({ event, step }) => {
    // Waits for payment - cancelled if order/cancelled event arrives
    await step.sleepUntil("wait-payment", event.data.paymentDue);
    await step.run("charge", () => charge(event.data));
  }
);
```

**Cancellation cleanup:** Listen for `inngest/function.cancelled`:

```typescript
export const cleanupJob = inngest.createFunction(
  { id: "cleanup-cancelled", triggers: [{ event: "inngest/function.cancelled" }] },
  async ({ event, step }) => {
    if (event.data.function_id === "my-job") {
      await step.run("cleanup", () => rollbackWork(event.data.run_id));
    }
  }
);
```

## Quick Reference: Pattern by Phase

| Phase | Pattern | File |
|-------|---------|------|
| **Trigger** | `inngest.send(createEvent(...))` | `features/<f>/server/actions/*.ts` |
| **Event schema** | `events.ts` with `create*Event()` | `features/<f>/server/inngest/` |
| **Job definition** | `inngest.createFunction({ id, triggers })` | `features/<f>/server/inngest/*.ts` |
| **DB operations** | Inside `step.run()` | `features/<f>/server/inngest/*.ts` |
| **Mark done** | Return `{ result }` | Job function |
| **Mark failed** | `throw new NonRetriableError()` | Inside `step.run()` |
| **Retry** | Automatic (default 5 attempts) | Built-in |
| **Cancel** | `cancelOn[]` config | `inngest.createFunction()` |
| **Cleanup on cancel** | Listen to `inngest/function.cancelled` | Separate job |

| Do | Don't |
|----|-------|
| Wrap all DB/API calls in `step.run()` | Put non-deterministic code outside steps |
| Return useful data from steps | Log outside steps (causes duplicates) |
| Reuse step IDs in loops | Change step IDs after deployment |

## Key Files

| File | Purpose |
|------|---------|
| `src/infrastructure/inngest/` | Inngest infrastructure folder |
| `src/infrastructure/inngest/client.ts` | Client singleton |
| `src/infrastructure/inngest/registry.ts` | Job registry |
| `src/infrastructure/inngest/index.ts` | Barrel export |
| `src/app/api/inngest/route.ts` | HTTP endpoint for Inngest |
| `features/*/server/inngest/*.ts` | Feature-owned jobs + events |

## Observability

| Tool | What |
|------|------|
| Inngest Dashboard | Step timing, retries, failures |
| `moduleLog` in services | Feature-specific logs |
| Sentry | Error aggregation |
