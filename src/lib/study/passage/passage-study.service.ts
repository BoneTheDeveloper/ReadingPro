import * as Sentry from "@sentry/nextjs";
import { generateComprehensionQuestions, type GeneratedQuestion } from "@/lib/ai/question-generator";
import { simplifyContent } from "@/lib/ai/content-simplifier";
import { createModuleLogger } from "@/lib/core/logger";
import { db } from "@/lib/db/client";
import { questionDataSchema } from "@/lib/db/passage-queries";
import { getTargetCEFRLevel, isSimplifiableCEFRLevel, type CEFRLevel } from "@/lib/domain/cefr";
import type { GeneratedStudyQuestionDto } from "@/lib/study/shared/study-response-schema";
import {
  STUDIO_GENERATION_TIMEOUT_MS,
  type StudioArtifactErrorCode,
} from "@/lib/study/shared/studio-artifact-types";

const log = createModuleLogger("lib:study:passage-service");

export type SimplifyPassageResult =
  | { simplifiedContent: string; simplifiedLevel: CEFRLevel }
  | { skipped: true; reason: string };

export async function simplifyPassageForUser(userId: string, passageId: string): Promise<SimplifyPassageResult> {
  const passage = await getOwnedPassage(userId, passageId);
  const originalLevel = passage.originalLevel as CEFRLevel | null;

  if (!originalLevel || !isSimplifiableCEFRLevel(originalLevel)) {
    return { skipped: true, reason: `Text is already ${originalLevel || "unknown"} level` };
  }

  const targetLevel = getTargetCEFRLevel(originalLevel) ?? "B1";
  Sentry.addBreadcrumb({ category: "ai", message: `Simplifying to ${targetLevel}`, level: "info" });
  const simplified = await Sentry.startSpan({ name: "ai:content-simplify", op: "ai" }, async () => {
    return simplifyContent(passage.content.slice(0, 10000), targetLevel);
  });

  if (!simplified) {
    throw new PassageStudyServiceError("Simplification failed — try again", "GENERATION_FAILED");
  }

  await Sentry.startSpan({ name: "db:passage-update", op: "db" }, async () => {
    return db.passage.update({
      where: { id: passageId, userId },
      data: {
        simplifiedContent: simplified.simplifiedText,
        simplifiedLevel: targetLevel,
      },
    });
  });

  return {
    simplifiedContent: simplified.simplifiedText,
    simplifiedLevel: targetLevel,
  };
}

export async function generateQuestionsForPassage(
  userId: string,
  passageId: string,
  artifactId: string,
): Promise<GeneratedStudyQuestionDto[]> {
  const passage = await getOwnedPassage(userId, passageId);
  const contentToAnalyze = passage.simplifiedContent || passage.content;

  Sentry.addBreadcrumb({ category: "ai", message: "Generating comprehension questions", level: "info" });
  const questionResult = await Sentry.startSpan({ name: "ai:question-gen", op: "ai" }, async () => {
    // Bound the LLM call so a hung upstream cannot hold the serverless invocation
    // open. Mirrors the client AbortController budget; surfaces as a TIMEOUT code.
    return withGenerationTimeout(generateComprehensionQuestions(contentToAnalyze.slice(0, 10000), 5));
  });

  if (!questionResult) {
    throw new PassageStudyServiceError("Question generation failed — try again", "GENERATION_FAILED");
  }

  const validQuestions = questionResult.questions.filter((q) =>
    isValidGeneratedQuestion(q, artifactId),
  );
  if (questionResult.questions.length === 0) {
    throw new PassageStudyServiceError("No questions generated — try again", "NO_QUESTIONS");
  }
  if (validQuestions.length === 0) {
    throw new PassageStudyServiceError("All generated questions failed validation — try again", "VALIDATION_FAILED");
  }

  await Sentry.startSpan({ name: "db:questions-create", op: "db" }, async () => {
    await db.question.createMany({
      data: validQuestions.map((question) => ({
        passageId,
        artifactId,
        ...toQuestionCreateInput(question),
      })),
    });
  });

  return validQuestions.map(toQuestionData);
}

async function getOwnedPassage(userId: string, passageId: string) {
  const passage = await Sentry.startSpan({ name: "db:passage-fetch", op: "db" }, async () => {
    return db.passage.findUnique({ where: { id: passageId, userId, deletedAt: null } });
  });

  if (!passage) {
    throw new PassageStudyServiceError("Passage not found");
  }
  return passage;
}

// Races a generation promise against the shared timeout budget. On timeout the
// pending work is abandoned (we cannot cancel the underlying SDK call) and a
// TIMEOUT-coded error is thrown so the route/client always settle.
async function withGenerationTimeout<T>(work: Promise<T>): Promise<T> {
  // If the timeout wins, `work` is left pending; swallow a late rejection so the
  // abandoned LLM call cannot surface as an unhandled promise rejection.
  work.catch((err) => log.warn({ err }, "Question generation settled after timeout"));

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new PassageStudyServiceError("Question generation timed out — try again", "TIMEOUT")),
      STUDIO_GENERATION_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function isValidGeneratedQuestion(question: GeneratedQuestion, artifactId: string) {
  const result = questionDataSchema.safeParse({
    artifactId,
    questionText: question.questionText,
    options: question.options,
    correctOption: question.correctAnswer,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    explanation: question.explanation,
  });

  if (!result.success) {
    log.warn(
      { context: { issues: result.error.issues } },
      "Generated question failed validation",
    );
  }
  return result.success;
}

function toQuestionCreateInput(question: GeneratedQuestion) {
  return {
    questionText: question.questionText,
    options: JSON.stringify(question.options),
    correctOption: question.correctAnswer,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    explanation: question.explanation,
    questionType: question.questionType,
    difficulty: question.difficulty,
  };
}

function toQuestionData(question: GeneratedQuestion, index: number): GeneratedStudyQuestionDto {
  return {
    id: `pending-${index}`,
    number: index + 1,
    questionText: question.questionText,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    questionType: question.questionType,
    difficulty: question.difficulty,
  };
}

export class PassageStudyServiceError extends Error {
  readonly code: StudioArtifactErrorCode;

  constructor(message: string, code: StudioArtifactErrorCode = "UPSTREAM_ERROR") {
    super(message);
    this.name = "PassageStudyServiceError";
    this.code = code;
  }
}
