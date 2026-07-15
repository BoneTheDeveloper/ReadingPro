---
phase: 3
title: "Migrate Inngest Infrastructure"
status: completed
priority: P2
effort: "2h"
dependencies: ["phase-01-scaffold-ai-infrastructure"]
---

# Phase 3: Migrate Inngest Infrastructure

## Overview

Create shared Inngest infrastructure in `src/infrastructure/inngest/`:
- `client.ts` — Inngest singleton
- `registry.ts` — Maps all feature jobs for the webhook
- `steps/ai.ts` — `runAIStep()` for AI calls in jobs

**Pattern:**
- Feature owns job definitions in `features/<f>/jobs/`
- Infrastructure provides: client, registry, shared step factories
- Service layer has no `step.run()` — jobs wrap them

## Requirements

- **Functional**: All jobs registered in webhook, shared steps available
- **Non-functional**: AI calls in jobs have structured logging + Sentry spans

## Architecture

```
src/infrastructure/inngest/
├── client.ts           # Inngest singleton
├── registry.ts         # Maps all feature jobs
└── steps/
    └── ai.ts          # runAIStep() step factory

src/infrastructure/inngest.ts    # Re-export for backward compat
```

### client.ts

```typescript
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "english-reading-training",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

### registry.ts

```typescript
import { inngest } from "./client";
import { processUploadJob } from "@/features/upload/server/jobs/process-upload";
import { generateQuestionsJob } from "@/features/studio-panel/server/jobs/generate-questions";

export const functions = [
  processUploadJob,
  generateQuestionsJob,
];

// In webhook route.ts:
// import { functions } from "@/infrastructure/inngest/registry";
// await inngest.handler({ body: await request.json(), ... }, ...);
```

### steps/ai.ts

```typescript
import { withAITrace, type AITraceContext } from "@/infrastructure/ai/observability";
import type { Step } from "inngest";

export async function runAIStep<T>(
  step: Step,
  stepName: string,
  ctx: AITraceContext,
  fn: () => Promise<T>
): Promise<T> {
  return step.run(stepName, async () => {
    return withAITrace(ctx, fn);
  });
}
```

**Note:** Storage is a separate swappable infrastructure (`infrastructure/storage/`). Not grouped with Inngest.

## Related Code Files

**Create:**
- `src/infrastructure/inngest/client.ts`
- `src/infrastructure/inngest/registry.ts`
- `src/infrastructure/inngest/steps/ai.ts`

**Modify:**
- `src/infrastructure/inngest.ts` → re-export from `client.ts`
- `src/app/api/inngest/route.ts` → import from registry

**Move (Phase 3 or 4):**
- `src/features/upload/server/inngest/process-upload.ts` → `src/features/upload/server/jobs/process-upload.ts`

**Note:** Storage refactoring is a **separate concern** — not in scope for this plan.

## Implementation Steps

1. **Create `src/infrastructure/inngest/client.ts`**
   - Move content from `inngest.ts` (Inngest singleton)
   - Export `inngest` singleton

2. **Update `src/infrastructure/inngest.ts`**
   - Re-export `inngest` from `client.ts`
   - Add deprecation comment pointing to `client.ts`

3. **Create `src/infrastructure/inngest/steps/ai.ts`**
   - Implement `runAIStep()` accepting Inngest `step` object
   - Combines `step.run()` + `withAITrace()`
   - Parameters: `step`, `stepName`, `AITraceContext`, `fn`

4. **Create `src/infrastructure/inngest/registry.ts`**
   - Import all feature jobs (empty initially)
   - Export `functions` array
   - Add comment: "Add new jobs here"

5. **Update webhook route**
   - `src/app/api/inngest/route.ts`
   - Import `functions` from registry instead of individual files

6. **Move upload job to feature**
   - Move `process-upload.ts` to `features/upload/server/jobs/`
   - Update imports
   - Add to registry

## Success Criteria

- [ ] `import { inngest } from "@/infrastructure/inngest/client"` works
- [ ] `import { inngest } from "@/infrastructure/inngest"` still works (backward compat)
- [ ] `runAIStep()` combines Inngest step + AI observability
- [ ] `import { functions } from "@/infrastructure/inngest/registry"` exports all jobs
- [ ] Upload job uses `deduplicate: true`
- [ ] `pnpm run typecheck` passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking upload job | Medium | High | Keep backward compat re-export, test after move |
| Missing job in registry | Medium | High | Registry is the single source of truth — must update it |

## Next Steps

Phase 4: Implement upload analyzers + migrate job to use shared steps.
