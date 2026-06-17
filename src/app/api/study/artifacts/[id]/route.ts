import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { db } from "@/server/db/client";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import { createModuleLogger } from "@/server/observability/logger";
import type { QuestionData } from "@/features/study/model/types";

const log = createModuleLogger("api:studio-artifacts:detail");

function parseQuestionOptions(value: unknown): QuestionData["options"] {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as QuestionData["options"];
    } catch {
      return [];
    }
  }
  return (value ?? []) as QuestionData["options"];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const user = await getAuthenticatedUser();
    
    // Scope through the parent artifact's owner so a user can only read
    // questions for artifacts they own (prevents cross-user id probing).
    const questions = await db.question.findMany({
      where: { artifactId: id, artifact: { userId: user.id } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        questionText: true,
        options: true,
        correctOption: true,
        sourceText: true,
        sourceLine: true,
        explanation: true,
        questionType: true,
        difficulty: true,
      },
    });

    if (questions.length === 0) {
      // Check if artifact exists but just has no questions yet, or if it doesn't exist/owned
      const artifact = await db.studioArtifact.findFirst({
        where: { id, userId: user.id }
      });
      if (!artifact) {
        return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
      }
    }

    const mapped: QuestionData[] = questions.map((q, i) => ({
      id: q.id,
      number: i + 1,
      questionText: q.questionText,
      options: parseQuestionOptions(q.options),
      correctAnswer: q.correctOption,
      sourceText: q.sourceText,
      sourceLine: q.sourceLine,
      explanation: q.explanation,
      questionType: q.questionType,
      difficulty: q.difficulty,
    }));

    return NextResponse.json({
      success: true,
      data: { questions: mapped },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    Sentry.captureException(error);
    log.error({ error, artifactId: id }, "Failed to load artifact detail");
    return NextResponse.json(
      { error: "Failed to load artifact detail" },
      { status: 500 }
    );
  }
}
