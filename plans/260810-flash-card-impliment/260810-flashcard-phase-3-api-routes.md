# Phase 3: API Routes

## Goal
Create flashcard route and update progress route with type-based validation.

## API Structure

```
/api/artifact
├── GET    ?passageId=xxx     → list artifacts
├── POST   /question          → generate questions
├── POST   /flashcard         → generate flashcards
├── GET    /[id]              → get artifact detail
├── DELETE /[id]              → delete artifact
└── PATCH  /[id]/progress     → update progress (type-aware)
```

## Files to Create/Modify

### 1. Create `src/app/api/artifact/flashcard/route.ts`

Pattern: same as question route

```ts
import "server-only";
import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import z from "zod";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { createArtifact } from "@/features/studio/server/service/artifact-crud";
import { generateAndStoreArtifact } from "@/features/studio/server/service/artifact-generator";
import { deleteArtifact } from "@/features/studio/server/service/artifact-crud";
import { AppError } from "@/lib/error/app-error";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

export const POST = withErrorHandling("create-flashcard", async (request) => {
  const { user } = await requireApiSession();
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json());

  const passage = await findPassageForUser(user.id, passageId);
  if (!passage) throw new AppError(404, "NOT_FOUND", "Passage not found");

  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.FLASHCARD,
    status: "PENDING",
  });

  after(async () => {
    try {
      await generateAndStoreArtifact({
        artifactId: artifact.id,
        userId: user.id,
        passageId,
        type: StudioArtifactType.FLASHCARD,
      });
    } catch (err) {
      log.error({ err, passageId: passage.id, userId: user.id }, "flashcard generation failed");
      Sentry.captureException(err, { tags: { passageId: passage.id } });
      await deleteArtifact(artifact.id, user.id);
    }
  });

  return Response.json({ artifact }, { status: 201 });
});
```

### 2. Modify `src/app/api/artifact/[id]/progress/route.ts`

**Type-aware progress validation:**

```ts
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { getArtifact } from "@/features/studio/server/service/artifact-crud";
import { updateArtifactProgress } from "@/features/studio/server/service/artifact-crud";
import { AppError } from "@/lib/error/app-error";
import { questionProgressSchema, flashcardProgressSchema } from "@/features/studio/schema/artifact";
import { StudioArtifactType } from "@/generated/prisma/enums";

export const PATCH = withErrorHandling("update-progress", async (request, { params }) => {
  const { user } = await requireApiSession();
  const { id } = params;
  const body = await request.json();

  // Get artifact to determine type
  const artifact = await getArtifact(id, user.id);

  // Validate progress based on type
  switch (artifact.type) {
    case StudioArtifactType.QUESTION: {
      const progress = questionProgressSchema.parse(body.progress);
      await updateArtifactProgress(id, user.id, progress);
      break;
    }
    case StudioArtifactType.FLASHCARD: {
      const progress = flashcardProgressSchema.parse(body.progress);
      await updateArtifactProgress(id, user.id, progress);
      break;
    }
    default:
      throw new AppError(400, "INVALID_TYPE", `Unknown artifact type: ${artifact.type}`);
  }

  return Response.json({ success: true });
});
```

### 3. Add `updateArtifactProgress` to `src/features/studio/server/service/artifact-crud.ts`

```ts
export async function updateArtifactProgress(
  id: string,
  userId: string,
  progress: object,
) {
  return prisma.studioArtifact.update({
    where: { id, userId },
    data: { progress },
  });
}
```

## Validation

```bash
pnpm typecheck
pnpm lint
```

## Criteria

- [ ] `POST /api/artifact/flashcard` creates artifact + triggers generation
- [ ] `PATCH /api/artifact/[id]/progress` validates by `artifact.type`
- [ ] `updateArtifactProgress` service function added
- [ ] TypeScript compiles clean
