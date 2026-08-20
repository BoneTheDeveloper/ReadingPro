---
phase: 2
title: "Create Workflow Definition"
status: complete
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Create Workflow Definition

## Overview

Create the `passageProcessingWorkflow` function in `src/workflows/passage-processing.ts` that orchestrates preprocessing and AI processing with unified error handling.

## Requirements

- Functional: Define `passageProcessingWorkflow` with `'use workflow'` directive
- Functional: Call `preprocessPassage` then `runPassageProcessing` in sequence
- Functional: Handle partial failures (log + Sentry, passage still usable)
- Functional: Handle fatal failures (set `FAILED` status)
- Non-functional: Keep service files unchanged (import them, don't duplicate)

## Architecture

```
passageProcessingWorkflow
  │
  ├─ try block
  │   ├─ preprocessPassage(input) → normalized text
  │   └─ runPassageProcessing({ passageId, normalizedText, ... })
  │       └─ Promise.allSettled([generateMetadata, cleanContent])
  │       └─ completePassageProcessing() ← called inside service
  │
  └─ catch block
      ├─ log.error(...)
      ├─ Sentry.captureException(...)
      └─ failPassageProcessing({ passageId })
```

## Related Code Files

- Create: `src/workflows/passage-processing.ts`
- Import: `src/features/passage/server/service/passage-preprocessing.ts`
- Import: `src/features/passage/server/service/passage-processing.ts`
- Import: `src/features/passage/server/service/passage-crud.ts`
- Import: `src/features/passage/schema.ts` (for `CreatePassageInput`)
- Import: `src/lib/logger.ts`
- Import: `@sentry/nextjs`

## Implementation Steps

1. **Create `src/workflows/` directory** (if not exists)

2. **Create `src/workflows/passage-processing.ts`**:

```typescript
import "server-only";
import { preprocessPassage } from "@/features/passage/server/service/passage-preprocessing";
import { runPassageProcessing } from "@/features/passage/server/service/passage-processing";
import {
  failPassageProcessing,
  completePassageProcessing,
} from "@/features/passage/server/service/passage-crud";
import type { CreatePassageInput } from "@/features/passage/schema";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export interface PassageProcessingWorkflowInput {
  passageId: string;
  input: CreatePassageInput;
  userTitle?: string;
  userId: string;
}

export async function passageProcessingWorkflow(args: PassageProcessingWorkflowInput) {
  "use workflow";

  try {
    // Step 1: Preprocess (text extraction + normalization)
    const { normalized } = await preprocessPassage(args.input);

    // Step 2: Run AI processing (metadata + content)
    // This internally calls completePassageProcessing on success
    // and returns { metadataError, contentError } for partial failures
    const { metadataError, contentError } = await runPassageProcessing({
      passageId: args.passageId,
      userId: args.userId,
      normalizedText: normalized,
      userTitle: args.userTitle,
    });

    // Handle partial failures (degraded but usable)
    if (metadataError || contentError) {
      log.warn(
        { metadataError, contentError, passageId: args.passageId },
        "passage-processing degraded",
      );
      Sentry.captureException(contentError ?? metadataError, {
        tags: { passageId: args.passageId },
      });
      // Note: completePassageProcessing was already called with fallbacks
      // so passage is still usable
    }
  } catch (err) {
    // Fatal failure
    log.error(
      { err, passageId: args.passageId, userId: args.userId },
      "passage-processing failed",
    );
    Sentry.captureException(err, { tags: { passageId: args.passageId } });
    await failPassageProcessing({
      userId: args.userId,
      passageId: args.passageId,
    });
  }
}
```

3. **Typecheck**
   ```bash
   pnpm typecheck
   ```

## Success Criteria

- [ ] `src/workflows/passage-processing.ts` created
- [ ] `passageProcessingWorkflow` uses `'use workflow'` directive
- [ ] Workflow imports and calls existing services
- [ ] Error handling: partial failures → warn + Sentry
- [ ] Error handling: fatal failures → `failPassageProcessing()`
- [ ] Typecheck passes

## Risk Assessment

- **Risk**: Service files modified unintentionally
  - **Mitigation**: Only import, do not modify service files
- **Risk**: `completePassageProcessing` called twice (once in service, once in workflow)
  - **Mitigation**: Workflow only calls `failPassageProcessing` in catch — service handles success path
