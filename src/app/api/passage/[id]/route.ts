import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { findPassageForUser, deletePassageForUser } from "@/features/passage/server/service/passage-crud";
import { AppError } from "@/lib/error/app-error";
import { z } from "zod";


export const GET = withErrorHandling("passages/[id]", async (_req, { params }) => {
  const { user } = await requireApiSession();
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const passage = await findPassageForUser(user.id, id);
  if (!passage || passage.status !== "COMPLETED") {
    throw new AppError(404, "NOT_FOUND", "Passage is not ready");
  }

  return Response.json(passage);
});

export const DELETE = withErrorHandling("passages/[id]", async (_req, { params }) => {
  const { user } = await requireApiSession();
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  await deletePassageForUser(user.id, id);
  return new Response(null, { status: 204 });
});
