import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserId } from "@/services/clerk";
import { getZodErrorMessage, toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import {
  generateQuestionsForPassage,
  PassageStudyServiceError,
} from "@/features/passage/services/passage-study.service";
import type { GeneratedStudyQuestionDto } from "@/features/studio-panel/schemas/study.schema";
import type { StudioArtifact } from "@/features/studio-panel/lib/studio-artifact-types";

const studyQuestionsPostSchema = z
  .object({
    passageId: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
    artifactId: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        "Invalid UUID",
      ),
  })
  .strict();

export async function POST(request: NextRequest) {
  return handleStudioQuestionsPost(request);
}

async function handleStudioQuestionsPost(request: NextRequest) {
  const log = createRequestLogger(
    "api:study:studio:questions",
    createRequestLogContext(request, "POST", "/api/study/studio/questions"),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      log.warn(
        "Invalid JSON payload received for study question generation",
      );
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const parsed = studyQuestionsPostSchema.safeParse(body);
    if (!parsed.success) {
      log.warn(
        {
          context: {
            issues: parsed.error.issues.map((issue) => issue.path.join(".")),
          },
        },
        "Invalid study question request rejected",
      );
      return NextResponse.json(
        { error: getZodErrorMessage(parsed.error) },
        { status: 400 },
      );
    }

    const { passageId, artifactId } = parsed.data;
    const userId = await getUserId();

    const { artifact, questions } = await generateQuestionsForPassage(
      userId,
      passageId,
      artifactId,
    );
    return createStudioQuestionsSuccessResponse({ artifact, questions });
  } catch (error) {
    if (error instanceof PassageStudyServiceError) {
      log.warn(
        { err: error },
        "Question generation rejected by study service",
      );
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 502 },
      );
    }

    return toHttp(error, log, "api:study:studio:questions");
  }
}

function createStudioQuestionsSuccessResponse(data: {
  artifact: StudioArtifact;
  questions: GeneratedStudyQuestionDto[];
}) {
  return NextResponse.json({ success: true, data });
}
