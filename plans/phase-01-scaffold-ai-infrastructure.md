---
phase: 1
title: "Scaffold AI Infrastructure"
status: completed
priority: P2
effort: "1h"
dependencies: []
---

# Phase 1: Scaffold AI Infrastructure

## Overview

Clean up and clarify `src/infrastructure/ai/` as the single entry point for all AI capabilities.

## Context

- Project uses Vercel AI SDK v7 + `@ai-sdk/openai` v3
- `createAI` factory does NOT exist in v7 — removed
- Current pattern: `openai("model-id")` from `@ai-sdk/openai` — correct v7 approach
- `model-config.ts` is dead (zero consumers) — delete
- `prompt-utils.ts` needs rename → `text-utils.ts`

## Requirements

- **Functional**: All existing AI calls continue working — zero behavior change
- **Non-functional**: Clean, well-documented, single entry point

## Actions

### 1. Delete `model-config.ts`

Dead weight — only contained deprecated `getStudyChatModelId()` shim with zero consumers.

### 2. Rename `prompt-utils.ts` → `text-utils.ts`

Rename to clarify purpose. Update import paths in consumers:
- `src/features/studio-panel/server/services/ai-chat.ts`
- `src/features/studio-panel/server/services/question-generator.ts`

### 3. Update `models.ts`

Current code is fine, just clean up docs:

```typescript
/**
 * Model registry — single source of truth for AI model configuration.
 *
 * Usage:
 *   import { MODELS, getModel } from "@/infrastructure/ai/models";
 *   const modelId = getModel("chat");
 */

export const MODELS = {
  chat: {
    id: "gpt-4o-mini",
    maxTokens: 16384,
  },
  structured: {
    id: "gpt-4o-mini",
    maxTokens: 8192,
  },
} as const;

export type ModelPurpose = keyof typeof MODELS;

/**
 * Get model ID for a given purpose.
 * Usage with Vercel AI SDK v7:
 *   import { openai } from "@/infrastructure/ai";
 *   import { getModel } from "@/infrastructure/ai/models";
 *   streamText({ model: openai(getModel("chat")), ... });
 */
export function getModel(purpose: ModelPurpose): string {
  return MODELS[purpose].id;
}
```

### 4. Keep `client.ts` as-is

Current simple re-export of `openai` from `@ai-sdk/openai` is correct for v7:

```typescript
/**
 * OpenAI client factory.
 * Single instance wrapping @ai-sdk/openai.
 *
 * Usage:
 *   import { openai } from "@/infrastructure/ai";
 *   import { streamText } from "ai";
 *
 *   streamText({ model: openai("gpt-4o-mini"), ... });
 */

import { openai } from "@ai-sdk/openai";

// Re-export openai for direct usage
export { openai };
```

### 5. Keep `observability.ts` as-is

Current implementation with `withAITrace()` is correct.

### 6. Update `index.ts`

```typescript
/**
 * AI Infrastructure — Public exports
 *
 * Usage:
 *   import { MODELS, getModel, openai, withAITrace } from "@/infrastructure/ai";
 *   import { wrapUserText } from "@/infrastructure/ai/text-utils";
 */

export { MODELS, getModel, type ModelPurpose } from "./models";
export { withAITrace, type AITraceContext } from "./observability";
export { openai } from "./client";
export { wrapUserText } from "./text-utils";
```

### 7. Update consumers

Update import in `ai-chat.ts`:
```typescript
// OLD
import { wrapUserText } from "@/infrastructure/ai/prompt-utils";
// NEW
import { wrapUserText } from "@/infrastructure/ai/text-utils";
```

Update import in `question-generator.ts`:
```typescript
// OLD
import { wrapUserText } from "@/infrastructure/ai/prompt-utils";
// NEW
import { wrapUserText } from "@/infrastructure/ai/text-utils";
```

## Related Code Files

**Delete:**
- `src/infrastructure/ai/model-config.ts`

**Rename:**
- `src/infrastructure/ai/prompt-utils.ts` → `src/infrastructure/ai/text-utils.ts`

**Modify:**
- `src/infrastructure/ai/models.ts`
- `src/infrastructure/ai/index.ts`
- `src/features/studio-panel/server/services/ai-chat.ts`
- `src/features/studio-panel/server/services/question-generator.ts`

## Success Criteria

- [ ] `model-config.ts` deleted
- [ ] `prompt-utils.ts` renamed to `text-utils.ts`
- [ ] `index.ts` exports all public symbols
- [ ] Consumer imports updated to new path
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes
- [ ] All existing AI functionality works (chat, question generation)

## Next Steps

Phase 2: Migrate studio-panel services to use full AI infrastructure.
