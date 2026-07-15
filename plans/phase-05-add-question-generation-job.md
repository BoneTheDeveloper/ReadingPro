---
phase: 5
title: "Add Question Generation Job"
status: completed
priority: P2
effort: "2h"
dependencies: ["phase-02-migrate-studio-panel", "phase-03-migrate-inngest-infrastructure"]
---

# Phase 5: Add Question Generation Job

## Overview

Add question generation as an async Inngest job:
- Create `jobs/generate-questions.ts` in studio-panel
- Create job status polling endpoint `/api/jobs/[id]`
- Update UI to handle async flow with polling

**Pattern:** Feature owns job, infrastructure provides client + shared steps.

## Requirements

- **Functional**: User can request quiz generation, poll for completion, view results
- **Non-functional**: Job has deduplication, AI calls are traced

## Architecture

### Job Flow

```
User clicks "Generate Quiz"
  → Server action sends Inngest event
  → Client starts polling /api/jobs/[jobId]
  → Job runs: generate questions → save to DB
  → Client redirects to quiz results
```

### Job Definition

```typescript
// features/studio-panel/server/jobs/generate-questions.ts
import { inngest } from "@/infrastructure/inngest";
import { runAIStep } from "@/infrastructure/inngest/steps/ai";
import { generateComprehensionQuestions } from "../services/question-ai";

export const generateQuestionsJob = inngest.createFunction(
  {
    id: "generate-questions",
    name: "Generate Questions",
    deduplicate: true,
  },
  { event: "studio/questions.generate" },
  async ({ event, step }) => {
    const { passageId, userId, questionCount = 5 } = event.data;

    // Step 1: Get passage content
    const passage = await step.run("get-passage", async () => {
      return prisma.passage.findUnique({
        where: { id: passageId, userId },
        select: { id: true, content: true, title: true }
      });
    });

    if (!passage) throw new Error("Passage not found");

    // Step 2: Generate questions (AI call with tracing)
    const questions = await runAIStep("generate-questions", {
      operation: "generate-questions",
      feature: "studio-panel",
      model: "structured",
    }, async () => {
      return generateComprehensionQuestions(passage.content, questionCount);
    });

    // Step 3: Save to DB
    await step.run("save-questions", async () => {
      // Create quiz artifact + questions in DB
      const artifact = await prisma.studioArtifact.create({ ... });
      await prisma.question.createMany({ data: questions.map(...) });
      return artifact;
    });

    return { artifactId: artifact.id, questionCount: questions.length };
  }
);
```

### Job Status Endpoint (Custom REST, polling only)

```typescript
// app/api/jobs/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  // Query Inngest API or database for run status
  const run = await inngest.client.getRun(params.id);
  return Response.json({
    status: run.status, // "Running" | "Completed" | "Failed"
    output: run.output,
    error: run.error,
  });
}
```

**Pattern:** Client polls every 2s until status is "Completed" or "Failed".

## Related Code Files

**Create:**
- `src/features/studio-panel/server/jobs/generate-questions.ts`
- `src/app/api/jobs/[id]/route.ts`
- `src/features/studio-panel/server/actions/question-job.ts`

**Modify:**
- `src/features/studio-panel/components/studio/quiz/quiz-content.tsx` → async flow
- `src/infrastructure/inngest/registry.ts` → register new job

## Implementation Steps

1. **Create `jobs/generate-questions.ts`**
   - Define event type: `{ name: "studio/questions.generate", data: { passageId, userId, questionCount } }`
   - Implement job with 3 steps: get passage → generate questions → save to DB
   - Enable `deduplicate: true`
   - Use `runAIStep()` for AI call

2. **Create `src/app/api/jobs/[id]/route.ts`**
   - GET endpoint for job status
   - Query Inngest for run status
   - Return `{ status, output, error }`

3. **Create server action `actions/question-job.ts`**
   - `requestQuestionGeneration(passageId, questionCount)` → sends Inngest event
   - Returns `{ jobId }` for client polling

4. **Update Inngest registry**
   - Add `generateQuestionsJob` to `src/infrastructure/inngest/registry.ts`

5. **Update UI `quiz-content.tsx`**
   - Add "Generate" button that calls server action
   - Add polling state after request
   - Redirect to results when job completes

6. **Add idempotency check**
   - Before generating, check if questions already exist for passage
   - Return existing artifact if found

7. **Run tests**

## Success Criteria

- [ ] Server action sends Inngest event
- [ ] Job processes asynchronously
- [ ] AI calls traced with Sentry
- [ ] Job status endpoint returns correct status
- [ ] Client polls and redirects to results
- [ ] Duplicate requests are deduplicated
- [ ] `pnpm run typecheck` passes
- [ ] Manual test: generate quiz, verify async flow works

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Job never completes | Low | Medium | Add timeout, error handling, user feedback |
| Client polling too aggressive | Low | Low | 2s polling interval is reasonable |
| Duplicate quiz requests | Medium | Low | `deduplicate: true` + idempotency check |

## Next Steps

None — this completes the AI infrastructure plan.
