---
phase: 2
title: "Update Flashcard Route"
status: completed
priority: P1
effort: "0.5h"
dependencies: [1]
completed: 2026-08-20T21:02:00+07:00
---

# Phase 2: Update Flashcard Route

## Overview

Update `POST /api/artifact/flashcard` to use the `artifactGenerationWorkflow` instead of `after()` for durable artifact generation.

## Requirements

- Functional: Route calls `start()` directly (no `after()`)
- Functional: Returns 201 immediately after triggering workflow
- Functional: Error handling in workflow (failStep + Sentry), not route
- Non-functional: No changes to service layer

## Related Code Files

- Modify: `app/api/artifact/flashcard/route.ts`
- Reference: `src/workflows/artifact-generation/index.ts`

## Target Implementation

Match passage route pattern:

```typescript
import { start } from "workflow/api";
import { artifactGenerationWorkflow } from "@/workflows/artifact-generation";
// ...
await start(artifactGenerationWorkflow, {
  input: {
    artifactId: artifact.id,
    userId: user.id,
    passageId,
    type: StudioArtifactType.FLASHCARD,
  },
});

return Response.json({ artifact }, { status: 201 });
```

## Implementation Steps

1. **Read current route**
   - Review `src/app/api/artifact/flashcard/route.ts`

2. **Update imports**
   - Remove: `import { after } from "next/server";`
   - Remove: `import { log } from "@/lib/logger";`
   - Remove: `import * as Sentry from "@sentry/nextjs";`
   - Remove: `import { updateArtifactStatus } from "@/features/studio/server/service/artifact-crud";`
   - Add: `import { start } from "workflow/api";`
   - Add: `import { artifactGenerationWorkflow } from "@/workflows/artifact-generation";`

3. **Replace after() block with workflow start()**
   - Remove the entire `after(async () => { ... })` block
   - Add `await start(artifactGenerationWorkflow, { input: {...} })` before return

4. **Verify typecheck**
   ```bash
   pnpm typecheck
   ```

## Success Criteria

- [ ] Route no longer imports `after`, `log`, `Sentry`, `updateArtifactStatus`
- [ ] Route imports `start` from `workflow/api`
- [ ] Workflow is triggered with correct input
- [ ] Returns 201 immediately (no awaiting generation)
- [ ] Typecheck passes
