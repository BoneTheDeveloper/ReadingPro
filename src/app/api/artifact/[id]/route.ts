import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { getArtifact, deleteArtifact } from "@/features/studio/server/service/artifact-crud";
import { z } from "zod";

export const GET = withErrorHandling("artifacts/[id]", async (_req, { params }) => {
  const { user } = await requireApiSession();
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const artifact = await getArtifact(id, user.id);
  return Response.json(artifact);
});

export const DELETE = withErrorHandling("artifacts/[id]", async (_req, { params }) => {
  const { user } = await requireApiSession();
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  await deleteArtifact(id, user.id);
  return new Response(null, { status: 204 });
});
