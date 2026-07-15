---
phase: 1
title: "Scaffold AI Infrastructure"
status: pending
priority: P2
effort: "2h"
dependencies: []
---

# Phase 1: Scaffold AI Infrastructure

## Overview

Create the shared AI infrastructure layer in `src/infrastructure/ai/`:
- `client.ts` — AI SDK factory wrapping Vercel AI SDK
- `models.ts` — Model registry with typed `ModelPurpose`
- `observability.ts` — `withAITrace()` wrapper with logging + Sentry
- Update `index.ts` for public exports

## Requirements

- **Functional**: Shared client works for all existing AI calls (chat, question-gen)
- **Non-functional**: Zero behavior change — same outputs, same latency

## Architecture

```
src/infrastructure/ai/
├── client.ts         # createAI() wrapper, single export
├── models.ts         # MODELS constant, getModel(), ModelPurpose type
├── observability.ts  # withAITrace(), AITraceContext
└── index.ts         # Re-exports
```

### client.ts

```typescript
import { createAI } from "ai";
import { openai } from "@ai-sdk/openai";

// Future: add openrouter when needed
// import { openrouter } from "@openrouter/ai-sdk-provider";

const providers = {
  openai,
  // openrouter,
};

export const ai = createAI({
  provider: providers[process.env.AI_PROVIDER ?? "openai"],
});
```

### models.ts

```typescript
export const MODELS = {
  chat: {
    id: "gpt-4o-mini",
    provider: "openai",
    maxTokens: 16384,
  },
  structured: {
    id: "gpt-4o-mini",
    provider: "openai",
    maxTokens: 8192,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

export function getModel(purpose: ModelPurpose): { modelId: string } {
  return { modelId: MODELS[purpose].id };
}
```

### observability.ts

```typescript
import { moduleLog } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export interface AITraceContext {
  operation: string;
  feature: string;
  model: string;
}

export async function withAITrace<T>(
  ctx: AITraceContext,
  fn: () => Promise<T>
): Promise<T> {
  const log = moduleLog(`ai:${ctx.feature}`);
  const start = Date.now();

  const span = Sentry.startSpan({
    name: `ai.${ctx.operation}`,
    op: "ai",
    attributes: {
      "ai.operation": ctx.operation,
      "ai.feature": ctx.feature,
      "ai.model": ctx.model,
    },
  });

  try {
    const result = await fn();
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span.setStatus({ code: 2, description: String(error) }); // ERROR
    span.recordException(error as Error);
    log.error({ err: error, ...ctx, latencyMs: Date.now() - start }, "AI call failed");
    throw error;
  } finally {
    span.end();
    log.info({ ...ctx, latencyMs: Date.now() - start }, "AI call completed");
  }
}
```

## Related Code Files

**Create:**
- `src/infrastructure/ai/client.ts`
- `src/infrastructure/ai/models.ts`
- `src/infrastructure/ai/observability.ts`

**Modify:**
- `src/infrastructure/ai/prompt-utils.ts` → move `wrapUserText` if needed
- `src/infrastructure/ai/model-config.ts` → deprecate, redirect to new

**Delete:**
- None in this phase

## Implementation Steps

1. **Create `src/infrastructure/ai/client.ts`**
   - Import `createAI` from `ai`, `openai` from `@ai-sdk/openai`
   - Export `ai` singleton wrapping Vercel AI SDK
   - Support `AI_PROVIDER` env var for future provider switching

2. **Create `src/infrastructure/ai/models.ts`**
   - Define `MODELS` constant with `chat` and `structured` entries
   - Export `ModelPurpose` type
   - Export `getModel(purpose)` helper

3. **Create `src/infrastructure/ai/observability.ts`**
   - Implement `AITraceContext` interface
   - Implement `withAITrace<T>()` async wrapper
   - Use Pino logger (`moduleLog`) for structured logging
   - Use Sentry `startSpan()` for tracing
   - Log `{ operation, feature, model, latencyMs }` on completion
   - Record errors with Sentry

4. **Update `src/infrastructure/ai/index.ts`**
   - Re-export `ai`, `getModel`, `withAITrace`, `MODELS`

5. **Deprecate old `model-config.ts`**
   - Add deprecation comment
   - Re-export from new `models.ts`

## Success Criteria

- [ ] `import { ai } from "@/infrastructure/ai"` works in all feature services
- [ ] `import { getModel } from "@/infrastructure/ai"` returns correct model ID
- [ ] `withAITrace()` logs structured data with `{ operation, feature, model, latencyMs }`
- [ ] Sentry span created with AI metadata
- [ ] No behavior change — existing AI calls produce same outputs
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing AI calls | Low | High | Only add new exports, don't modify existing `model-config.ts` initially |
| Sentry span conflicts | Low | Low | Use distinct span names (`ai.chat`, `ai.questions`) |

## Next Steps

Phase 2: Migrate studio-panel to use new infrastructure.
