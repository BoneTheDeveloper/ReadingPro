import { requireApiSession } from "@/lib/auth/session";
import { z } from "zod";
import { updateArtifactProgress } from "@/features/studio/server/service/artifact-progress";
import { getArtifact } from "@/features/studio/server/service/artifact-crud";
import {
  questionProgressSchema,
  flashcardProgressSchema,
} from "@/features/studio/schema/artifact";
import { StudioArtifactType } from "@/generated/prisma/enums";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { AppError } from "@/lib/error/app-error";

export const PATCH = withErrorHandling("artifacts/[id]/progress", async (request, { params }) => {
  const { user } = await requireApiSession();
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const body = await request.json();

  // Get artifact to determine type
  const artifact = await getArtifact(id, user.id);

  // Validate progress based on type
  let progress: object;
  switch (artifact.type) {
    case StudioArtifactType.QUESTION: {
      progress = questionProgressSchema.parse(body.progress);
      break;
    }
    case StudioArtifactType.FLASHCARD: {
      progress = flashcardProgressSchema.parse(body.progress);
      break;
    }
    default:
      throw new AppError(400, "VALIDATION", `Unknown artifact type: ${artifact.type}`);
  }

  await updateArtifactProgress(id, user.id, progress);
  return Response.json({ success: true });
});
