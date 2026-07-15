---
phase: 2
title: "Migrate Studio-Panel"
status: pending
priority: P2
effort: "1h"
dependencies: ["phase-01-scaffold-ai-infrastructure"]
---

# Phase 2: Migrate Studio-Panel

## Overview

Update `studio-panel` AI services to use the new shared infrastructure:
- `ai-chat.ts` → use `ai` client + `getModel()`
- `question-generator.ts` → use `ai` client + `getModel()` + `withAITrace()`

## Requirements

- **Functional**: Chat and question generation work identically
- **Non-functional**: AI calls now logged with feature/tagging

## Architecture

### Before

```typescript
// features/studio-panel/server/services/ai-chat.ts
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
// ...
streamText({ model: openai("gpt-4o-mini"), ... });
```

### After

```typescript
// features/studio-panel/server/services/chat-ai.ts
import { ai } from "@/infrastructure/ai";
import { getModel } from "@/infrastructure/ai/models";
// ...
ai.streamText({ model: getModel("chat").modelId, ... });
```

## Related Code Files

**Modify:**
- `src/features/studio-panel/server/services/ai-chat.ts` → update internal code
- `src/features/studio-panel/server/services/question-generator.ts` → update internal code
- `src/features/studio-panel/server/actions/studio-panel.ts` → update imports

**Note:** File names remain unchanged — `ai-chat.ts` and `question-generator.ts` are descriptive as-is.

## Implementation Steps

1. **Update `ai-chat.ts`**
   - Keep current filename
   - Update imports from `@/infrastructure/ai/prompt-utils` (keep)
   - Add `import { ai } from "@/infrastructure/ai"`
   - Add `import { getModel } from "@/infrastructure/ai/models"`
   - Replace `streamText({ model: openai("gpt-4o-mini"), ... })` → `ai.streamText({ model: getModel("chat").modelId, ... })`
   - Remove unused `import { openai } from "@ai-sdk/openai"`

2. **Update `question-generator.ts`**
   - Keep current filename
   - Add `import { ai } from "@/infrastructure/ai"`
   - Add `import { getModel } from "@/infrastructure/ai/models"`
   - Add `import { withAITrace } from "@/infrastructure/ai/observability"`
   - Wrap AI call with `withAITrace()`:
   ```typescript
   const { object } = await withAITrace(
     { operation: "generate-questions", feature: "studio-panel", model: "structured" },
     () => ai.generateObject({ model: getModel("structured").modelId, ... })
   );
   ```
   - Remove unused `import { openai } from "@ai-sdk/openai"`

3. **Update action imports** (no file rename needed)
   - `src/features/studio-panel/server/actions/studio-panel.ts`
   - Verify imports point to correct service files

4. **Verify typecheck and lint**

## Success Criteria

- [ ] Chat streaming works identically
- [ ] Question generation works identically
- [ ] AI calls logged with `{ operation, feature: "studio-panel", model, latencyMs }`
- [ ] Sentry spans created with AI metadata
- [ ] No `@ai-sdk/openai` direct imports in studio-panel services
- [ ] `pnpm run typecheck` passes
- [ ] `pnpm run lint` passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking chat streaming | Low | High | Test streaming behavior manually after change |
| Missing model capability | Low | Medium | Verify `gpt-4o-mini` supports all existing parameters |

## Next Steps

Phase 3: Migrate Inngest infrastructure.
