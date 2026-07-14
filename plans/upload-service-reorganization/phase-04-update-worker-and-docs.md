---
phase: 4
title: Update-Worker-and-Docs
status: completed
priority: P2
effort: 1h
dependencies:
  - phase-03-create-pipeline-orchestrator
---

# Phase 4: Update-Worker-and-Docs

## Overview

Refactor the Inngest worker to use the new `upload-processor.service.ts`, and update documentation to reflect the new architecture.

## Requirements

- Functional: Worker calls pipeline orchestrator, documents updated
- Non-functional: Maintain backward compatibility, preserve existing API contracts

## Architecture

**Before (current worker):**
```typescript
// process-upload.ts — inline steps
const resolvedText = await step.run("resolve-text", async () => { ... });
const cefrLevel = await step.run("detect-cefr-level", async () => "B2");
const passage = await step.run("create-passage", async () => { ... });
```

**After (refactored worker):**
```typescript
// process-upload.ts — thin orchestrator
await step.run("update-job-status-to-processing", ...);
const processedPassage = await step.run("process-upload", async () =>
  processUpload(event.data)
);
await step.run("update-job-status-to-done", ...);
```

## Related Code Files

- Modify: `src/services/inngest/functions/process-upload.ts`
- Modify: `docs/Flow/upload/upload-data-flow.md`
- Modify: `docs/Flow/upload/upload-ai-architecture.md`

## Implementation Steps

### 1. Refactor Worker

Update `process-upload.ts`:

```typescript
import { inngest, UPLOAD_PROCESS_EVENT } from "@/services/inngest/client";
import { step } from "inngest";
import { prisma } from "@/lib/prisma";
import { processUpload, type UploadProcessorInput } from "@/features/upload/services/upload-processor.service";

export const processUploadJob = inngest.createFunction(
  { id: "process-upload-job", name: "Process Upload Job" },
  { event: UPLOAD_PROCESS_EVENT },
  async ({ event }: { event: { data: UploadProcessorInput } }) => {
    const { jobId } = event.data;

    const failJob = async (error: string) => {
      await prisma.uploadJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error },
      }).catch(() => {});
    };

    try {
      // Stage 1: Update status
      await step.run("update-job-status-to-processing", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "PROCESSING" },
        });
      });

      // Stage 2: Process upload (orchestrates all stages)
      const processedPassage = await step.run("process-upload", async () => {
        return processUpload(event.data);
      });

      // Stage 3: Create passage
      await step.run("create-passage", async () => {
        await prisma.passage.create({
          data: {
            id: processedPassage.id,
            userId: event.data.userId,
            title: processedPassage.title,
            content: processedPassage.content,
            cefrLevel: processedPassage.cefrLevel as any,
            wordCount: processedPassage.wordCount,
            sourceType: processedPassage.sourceType,
            filePath: processedPassage.filePath,
            createdAt: processedPassage.createdAt,
          },
        });
      });

      // Stage 4: Mark done
      await step.run("update-job-status-to-done", async () => {
        await prisma.uploadJob.update({
          where: { id: jobId },
          data: { status: "DONE", passageId: processedPassage.id },
        });
      });

      return { jobId, passageId: processedPassage.id, cefrLevel: processedPassage.cefrLevel };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await failJob(message);
      throw error;
    }
  }
);
```

### 2. Update upload-data-flow.md

Add section about service architecture:

```markdown
### Service Layer

Processing logic is organized into services:

| Service | Purpose |
|---------|---------|
| `upload-processor.service.ts` | Pipeline orchestrator |
| `text-normalizer.service.ts` | Text normalization |
| `pdf-normalizer.service.ts` | PDF-specific cleanup |
| `cefr-detector.service.ts` | CEFR level (placeholder: returns "B2") |
| `vocabulary-extractor.service.ts` | Vocabulary extraction (placeholder: returns []) |
| `topic-tagger.service.ts` | Topic tagging (placeholder: returns []) |
```

Update worker steps table to show services:

| Step | Service | State |
|------|---------|-------|
| `update-job-status-to-processing` | Direct Prisma | Implemented |
| `process-upload` | `upload-processor.service.ts` | New |
| `create-passage` | Direct Prisma | Implemented |
| `update-job-status-to-done` | Direct Prisma | Implemented |

### 3. Update upload-ai-architecture.md

Mark Phase 3 (Service reorganization) as completed:

```markdown
| Phase | Items | Status |
|-------|-------|--------|
| 1 | Complete upload types | Partial | YouTube placeholder |
| 2 | Text normalization | Partial | Basic cleanup done, PDF artifacts TODO |
| 3 | Service reorganization | ✅ Done | `services/` structure created |
| 4 | AI CEFR detection | Placeholder | Returns "B2", ready for AI |
| 5 | Vocabulary extraction | Placeholder | Returns [], ready for AI |
| 6 | Topic/concept tagging | Placeholder | Returns [], ready for AI |
```

Add migration notes:

```markdown
### Migration Notes (Phase 4)

As of this phase:
- [x] `services/` directory created with normalizers and analyzers
- [x] `upload-processor.service.ts` orchestrates pipeline
- [x] Worker refactored to use pipeline orchestrator
- [ ] YouTube transcript fetch (Phase 1)
- [ ] AI CEFR detection (Phase 4)
- [ ] Vocabulary extraction (Phase 5)
- [ ] Topic tagging (Phase 6)
```

## Success Criteria

- [ ] `process-upload.ts` calls `processUpload()` from service
- [ ] Worker steps reduced from 5 to 4 (process-upload replaces inline steps)
- [ ] `upload-data-flow.md` updated with service layer info
- [ ] `upload-ai-architecture.md` updated with migration status

## Risk Assessment

- **Risk**: Breaking existing functionality during worker refactor
- **Mitigation**: Keep Inngest step structure, only move logic to service; test after refactor
