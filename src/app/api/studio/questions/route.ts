import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/server/auth/auth-utils";
import { getZodErrorMessage, isAuthenticationRequiredError, isOwnershipMissError } from "@/server/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/server/observability/logger";
import { generateQuestionsForPassage, PassageStudyServiceError } from "@/features/passage/db/passage-study.service";
import type { GeneratedStudyQuestionDto } from "@/contracts/study/study-response-schema";
import type { StudioArtifact } from "@/contracts/study/studio-artifact-types";

const studyQuestionsPostSchema = z.object({
  passageId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID"),
  artifactId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID"),
}).strict();

export async function POST(request: NextRequest) {
  return handleStudioQuestionsPost(request);
}

async function handleStudioQuestionsPost(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:study:studio:questions",
    createRequestLogContext(request, "POST", "/api/study/studio/questions"),
  );

  try {
    let body: unknown;
    try {
      body = await Sentry.startSpan(
        {
          name: "api:study:studio:questions-parse-body",
          op: "http.server",
          attributes: {
            "http.request.method": "POST",
            "url.path": "/api/study/studio/questions",
          },
        },
        () => request.json(),
      );
    } catch {
      requestLog.warn("Invalid JSON payload received for study question generation");
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = studyQuestionsPostSchema.safeParse(body);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((issue) => issue.path.join(".")) } },
        "Invalid study question request rejected",
      );
      return NextResponse.json({ error: getZodErrorMessage(parsed.error) }, { status: 400 });
    }

    const { passageId, artifactId } = parsed.data;
    const userId = await Sentry.startSpan(
      {
        name: "api:study:studio:questions-authenticate",
        op: "auth",
        attributes: { "study.passage_id": passageId },
      },
      () => getUserId(),
    );

    const { artifact, questions } = await generateQuestionsForPassage(userId, passageId, artifactId);
    return createStudioQuestionsSuccessResponse({ artifact, questions });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (isOwnershipMissError(error, ["passage"])) {
      return NextResponse.json({ error: "Passage not found." }, { status: 404 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: getZodErrorMessage(error) }, { status: 400 });
    }

    if (error instanceof PassageStudyServiceError) {
      requestLog.warn({ err: error }, "Question generation rejected by study service");
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }

    requestLog.error({ err: error }, "Failed to generate study questions");
    Sentry.captureException(error, {
      tags: { route: "api:study:studio:questions", method: "POST" },
    });
    return NextResponse.json(
      { error: "Question generation failed — try again", code: "UNKNOWN" },
      { status: 500 },
    );
  }
}

function createStudioQuestionsSuccessResponse(data: { artifact: StudioArtifact; questions: GeneratedStudyQuestionDto[] }) {
  return NextResponse.json({ success: true, data });
}
