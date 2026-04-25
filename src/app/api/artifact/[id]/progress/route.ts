import { requireApiSession } from "@/lib/auth/session";
import { z } from "zod";
import { updateArtifactProgress } from "@/features/studio/server/service/artifact-progress";
import { updateArtifactProgressInputSchema } from "@/features/studio/schema/artifact";
import { withErrorHandling } from "@/lib/error/with-error-handling";

export const PATCH = withErrorHandling("artifacts/[id]/progress", async (request, { params }) => {
  const { user } = await requireApiSession();
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const { progress } = updateArtifactProgressInputSchema.parse(await request.json());

  await updateArtifactProgress(id, user.id, progress);
  return Response.json({ success: true });
});
