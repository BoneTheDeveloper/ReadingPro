import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/modules/auth/require-session";
import { StudioArtifactType } from "@/server/db/generated/enums";
import { z } from "zod";
import { requireReadyPassage } from "@/server/modules/passage";
import {
  createArtifact,
  deleteArtifact,
  getArtifact,
  listArtifactsForUser,
} from "./artifact-crud";
import { updateArtifactProgress } from "./artifact-progress";
import {
  questionProgressSchema,
  flashcardProgressSchema,
} from "@/shared/studio/artifact";
import { AppError } from "@/server/lib/errors";
import { start } from "workflow/api";
import { artifactGenerationWorkflow } from "./workflow/index";
import type { AuthEnv } from "@/server/env";

const ArtifactIdParamSchema = z.object({ id: z.uuid() });
const CreateArtifactInputSchema = z.object({ passageId: z.uuid() });

export const artifactRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    const passageId = c.req.query("passageId");

    if (!passageId) throw new AppError("request.invalid", "passageId is required");

    const artifacts = await listArtifactsForUser(c.var.user.id, passageId);
    return c.json(artifacts);
  })
  .post("/flashcard", validate("json", CreateArtifactInputSchema), async (c) => {
    const { user } = c.var;
    const { passageId } = c.req.valid("json");

    await requireReadyPassage(user.id, passageId);

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

    return c.json({ artifact }, 201);
  })
  .post("/question", validate("json", CreateArtifactInputSchema), async (c) => {
    const { user } = c.var;
    const { passageId } = c.req.valid("json");

    await requireReadyPassage(user.id, passageId);

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

    return c.json({ artifact }, 201);
  })
  .get("/:id", validate("param", ArtifactIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const artifact = await getArtifact(id, c.var.user.id);
    // Mirrors passages/[id]: a non-terminal or failed artifact has no content to
    // serve, so it is 404 rather than a 200 with a null body.
    if (artifact.status !== "COMPLETED") throw new AppError("artifact.not_found", "Artifact not found", { id: id });
    return c.json(artifact);
  })
  .delete("/:id", validate("param", ArtifactIdParamSchema), async (c) => {
    await deleteArtifact(c.req.valid("param").id, c.var.user.id);
    return c.body(null, 204);
  })
  .patch("/:id/progress", validate("param", ArtifactIdParamSchema), async (c) => {
    const { user } = c.var;
    const { id } = c.req.valid("param");
    const body = await c.req.json();

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
        throw new AppError("request.invalid", `Unknown artifact type: ${artifact.type}`);
    }

    await updateArtifactProgress(id, user.id, progress);
    return c.json({ success: true });
  });
