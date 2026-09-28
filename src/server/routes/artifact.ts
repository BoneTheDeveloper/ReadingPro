import { Hono } from "hono";
import { withErrorHandling } from "@/server/lib/error/with-error-handling";
import { requireApiSession } from "@/server/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import { z } from "zod";
import { findPassageForUser } from "@/server/services/passage/passage-crud";
import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  listArtifactsForUser,
} from "@/server/services/studio/artifact-crud";
import { updateArtifactProgress } from "@/server/services/studio/artifact-progress";
import {
  questionProgressSchema,
  flashcardProgressSchema,
} from "@/shared/contracts/studio-artifact";
import { AppError, NotFoundError } from "@/server/lib/error/app-error";
import { start } from "workflow/api";
import { artifactGenerationWorkflow } from "@/workflows/artifact-generation/index";

export const artifactRoutes = new Hono();

artifactRoutes.get("/", withErrorHandling("artifacts", async (request) => {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const url = new URL(request.url);
  const passageId = url.searchParams.get("passageId");

  if (!passageId) throw new AppError(400, "VALIDATION", "passageId is required");

  const artifacts = await listArtifactsForUser(user.id, passageId);
  return Response.json(artifacts);
}));

artifactRoutes.post("/flashcard", withErrorHandling("create-flashcard", async (request) => {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json());

  const passage = await findPassageForUser(user.id, passageId);
  // Content is empty until processing completes — generating from it would
  // feed the model an empty passage.
  if (!passage || passage.status !== "COMPLETED") {
    throw new AppError(404, "NOT_FOUND", "Passage is not ready");
  }

  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.FLASHCARD,
    status: "PENDING",
  });

  await start(artifactGenerationWorkflow, [{
    artifactId: artifact.id,
    userId: user.id,
    passageId,
    type: StudioArtifactType.FLASHCARD,
  }]);

  return Response.json({ artifact }, { status: 201 });
}));

artifactRoutes.post("/question", withErrorHandling("create-question", async (request) => {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json());

  const passage = await findPassageForUser(user.id, passageId);
  // Content is empty until processing completes — generating from it would
  // feed the model an empty passage.
  if (!passage || passage.status !== "COMPLETED") {
    throw new AppError(404, "NOT_FOUND", "Passage is not ready");
  }

  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.QUESTION,
    status: "PENDING",
  });

  await start(artifactGenerationWorkflow, [{
    artifactId: artifact.id,
    userId: user.id,
    passageId,
    type: StudioArtifactType.QUESTION,
  }]);

  return Response.json({ artifact }, { status: 201 });
}));

artifactRoutes.get("/:id", withErrorHandling("artifacts/[id]", async (req, { params }) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const artifact = await getArtifact(id, user.id);
  // Mirrors passages/[id]: a non-terminal or failed artifact has no content to
  // serve, so it is 404 rather than a 200 with a null body.
  if (artifact.status !== "COMPLETED") throw new NotFoundError("Artifact", id);
  return Response.json(artifact);
}));

artifactRoutes.delete("/:id", withErrorHandling("artifacts/[id]", async (req, { params }) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  await deleteArtifact(id, user.id);
  return new Response(null, { status: 204 });
}));

artifactRoutes.patch("/:id/progress", withErrorHandling("artifacts/[id]/progress", async (request, { params }) => {
  const auth = await requireApiSession(request);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
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
}));
