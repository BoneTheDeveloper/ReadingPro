import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { listArtifactsForUser } from "@/features/studio/server/service/artifact-crud";
import { AppError } from "@/lib/error/app-error";

export const GET = withErrorHandling("artifacts", async (request) => {
  const { user } = await requireApiSession();
  const url = new URL(request.url);
  const passageId = url.searchParams.get("passageId");

  if (!passageId) throw new AppError(400, "VALIDATION", "passageId is required");

  const artifacts = await listArtifactsForUser(user.id, passageId);
  return Response.json(artifacts);
});
