import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { getArtifact, deleteArtifact } from "@/features/studio/server/service/artifact-crud";
import { NotFoundError } from "@/lib/error/app-error";
import { z } from "zod";

export const GET = withErrorHandling("artifacts/[id]", async (_req, { params }) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const artifact = await getArtifact(id, user.id);
  // Mirrors passages/[id]: a non-terminal or failed artifact has no content to
  // serve, so it is 404 rather than a 200 with a null body.
  if (artifact.status !== "COMPLETED") throw new NotFoundError("Artifact", id);
  return Response.json(artifact);
});

export const DELETE = withErrorHandling("artifacts/[id]", async (_req, { params }) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  await deleteArtifact(id, user.id);
  return new Response(null, { status: 204 });
});
