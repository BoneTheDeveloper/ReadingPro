---
phase: 3
title: "Update Route to Use Workflow"
status: pending
priority: P1
effort: "1h"
dependencies: [1, 2]
---

# Phase 3: Update Route to Use Workflow

## Overview

Refactor `POST /api/passage` to trigger the workflow via `start()` instead of using `after()`. The route becomes a thin trigger layer.

## Requirements

- Functional: Route triggers `passageProcessingWorkflow` via `start()`
- Functional: Route returns `202 Accepted` immediately
- Functional: All preprocessing moved to workflow
- Non-functional: Auth and input validation remain in route

## Architecture

**Before:**
```
POST /api/passage
  ├─ preprocessPassage() ← HERE (sync in route)
  ├─ createPassageForUser()
  └─ after() {
        runPassageProcessing()
        error handling
     }
```

**After:**
```
POST /api/passage
  ├─ validate input (CreatePassageInputSchema)
  ├─ createPassageForUser() (status: PENDING)
  └─ start(passageProcessingWorkflow, [{ passageId, input, ... }])
      └─ return 202

--- Workflow (separate) ---
passageProcessingWorkflow
  ├─ preprocessPassage(input)
  └─ runPassageProcessing({ passageId, normalizedText, ... })
```

## Related Code Files

- Modify: `src/app/api/passage/route.ts`
- Remove: `after()` import from `next/server`
- Import: `start` from `workflow/api`
- Import: `passageProcessingWorkflow` from `@/workflows/passage-processing`

## Implementation Steps

1. **Update `src/app/api/passage/route.ts`**:

```typescript
import { after } from "next/server"; // REMOVE this
import { start } from "workflow/api"; // ADD this
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  createPassageForUser,
  listPassagesForUser,
} from "@/features/passage/server/service/passage-crud";
import { passageProcessingWorkflow } from "@/workflows/passage-processing";
import { CreatePassageInputSchema } from "@/features/passage/schema";

export const GET = withErrorHandling("passages", async () => {
  // unchanged
});

export const maxDuration = 300;

export const POST = withErrorHandling("create-passage", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;

  // 1. Validate input
  const input = CreatePassageInputSchema.parse(await req.json());

  // 2. Create passage with PENDING status
  const passage = await createPassageForUser({
    userId: user.id,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  // 3. Trigger durable workflow
  await start(passageProcessingWorkflow, [{
    passageId: passage.id,
    input,
    userTitle: input.title,
    userId: user.id,
  }]);

  // 4. Return 202 Accepted immediately
  return Response.json(passage, { status: 202 });
});
```

2. **Key changes from current implementation**:
   - Removed `preprocessPassage` call (moved to workflow)
   - Removed `after()` callback
   - Removed `runPassageProcessing` import and call
   - Removed `failPassageProcessing` in catch
   - Added `start()` from workflow API
   - Returns `202` instead of `201` (accepted vs created)

3. **Typecheck**
   ```bash
   pnpm typecheck
   ```

## Success Criteria

- [ ] `after()` removed from imports
- [ ] `start` imported from `workflow/api`
- [ ] `passageProcessingWorkflow` imported from `@/workflows/passage-processing`
- [ ] Route creates passage, starts workflow, returns 202
- [ ] No preprocessing or processing logic in route
- [ ] Typecheck passes

## Risk Assessment

- **Risk**: HTTP status change from 201 to 202
  - **Impact**: Client-side code may expect 201
  - **Mitigation**: Check client mutations — likely use `useMutation` which handles 2xx
- **Risk**: Preprocessing validation moved to workflow
  - **Impact**: Bad YouTube URLs now create a PENDING passage that fails later
  - **Mitigation**: Document that FAILED status indicates processing failure, not just AI timeout
