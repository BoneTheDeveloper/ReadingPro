import "server-only";
import * as Sentry from "@sentry/nextjs";
import {
  generateComprehensionQuestions,
  type GeneratedQuestion,
} from "@/services/ai/question-generator";
import { createModuleLogger } from "@/services/logger";
import { questionDataSchema } from "@/features/passage/db/passage-queries";
import type { GeneratedStudyQuestionDto } from "@/features/studio-panel/schemas/study.schema";
import {
  STUDIO_GENERATION_TIMEOUT_MS,
  type StudioArtifact,
  type StudioArtifactErrorCode,
  type StudioArtifactStatus,
  type StudioArtifactType,
} from "@/features/studio-panel/lib/studio-artifact-types";
import {
  createStudioArtifactWithQuestions,
  findExistingStudioArtifact,
  findOwnedPassage,
} from "./passage-study.repository";

const log = createModuleLogger("lib:study:passage-service");

export async function generateQuestionsForPassage(
  userId: string,
  passageId: string,
  artifactId: string,
): Promise<{
  artifact: StudioArtifact;
  questions: GeneratedStudyQuestionDto[];
}> {
  const passage = await getOwnedPassage(userId, passageId);

  // Idempotency: if this artifact was already committed (e.g. double-submit or
  // retry after a lost response), return the existing data without re-generating.
  const existing = await findExistingStudioArtifact(artifactId, userId);
  if (existing) {
    return {
      artifact: rowToArtifact(existing),
      questions: existing.questions.map(rowToExistingQuestionDto),
    };
  }

  const contentToAnalyze = passage.simplifiedContent || passage.content;

  Sentry.addBreadcrumb({
    category: "ai",
    message: "Generating comprehension questions",
    level: "info",
  });
  const questionResult = await Sentry.startSpan(
    { name: "ai:question-gen", op: "ai" },
    async () => {
      // Bound the LLM call so a hung upstream cannot hold the serverless invocation
      // open. Mirrors the client AbortController budget; surfaces as a TIMEOUT code.
      return withGenerationTimeout(
        generateComprehensionQuestions(contentToAnalyze.slice(0, 10000), 5),
      );
    },
  );

  if (!questionResult) {
    throw new PassageStudyServiceError(
      "Question generation failed — try again",
      "GENERATION_FAILED",
    );
  }

  const validQuestions = questionResult.questions.filter((q) =>
    isValidGeneratedQuestion(q, artifactId),
  );
  if (questionResult.questions.length === 0) {
    throw new PassageStudyServiceError(
      "No questions generated — try again",
      "NO_QUESTIONS",
    );
  }
  if (validQuestions.length === 0) {
    throw new PassageStudyServiceError(
      "All generated questions failed validation — try again",
      "VALIDATION_FAILED",
    );
  }

  // Atomic: create artifact (status "done") + questions in one transaction so no
  // partial state can be persisted. LLM ran before this — the transaction is
  // insert-only and short, no long-running DB connection.
  const { artifact } = await createStudioArtifactWithQuestions({
    artifactId,
    passageId,
    userId,
    title: passage.title,
    questions: validQuestions.map(toQuestionCreateInput),
  });

  return {
    artifact: rowToArtifact(artifact),
    questions: validQuestions.map(toQuestionData),
  };
}

async function getOwnedPassage(userId: string, passageId: string) {
  const passage = await findOwnedPassage(userId, passageId);

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
  work.catch((err) =>
    log.warn({ err }, "Question generation settled after timeout"),
  );

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new PassageStudyServiceError(
            "Question generation timed out — try again",
            "TIMEOUT",
          ),
        ),
      STUDIO_GENERATION_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function isValidGeneratedQuestion(
  question: GeneratedQuestion,
  artifactId: string,
) {
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
    // `options` is a Json column — store the array natively so reads get an array
    // back. Stringifying here would persist a JSON string and break `.map` on load.
    options: question.options,
    correctOption: question.correctAnswer,
    sourceText: question.sourceText,
    sourceLine: question.sourceLine,
    explanation: question.explanation,
    questionType: question.questionType,
    difficulty: question.difficulty,
  };
}

function toQuestionData(
  question: GeneratedQuestion,
  index: number,
): GeneratedStudyQuestionDto {
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

function rowToArtifact(row: {
  id: string;
  type: string;
  passageId: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  quizResult?: {
    completedAt: Date;
    correctCount: number;
    totalQuestions: number;
    accuracyRate: number;
  } | null;
}): StudioArtifact {
  return {
    id: row.id,
    type: row.type as StudioArtifactType,
    passageId: row.passageId,
    title: row.title,
    status: row.status as StudioArtifactStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    quizResult: row.quizResult
      ? {
          completedAt: row.quizResult.completedAt.toISOString(),
          correctCount: row.quizResult.correctCount,
          totalQuestions: row.quizResult.totalQuestions,
          accuracyRate: row.quizResult.accuracyRate,
        }
      : undefined,
  };
}

function rowToExistingQuestionDto(
  q: {
    id: string;
    questionText: string;
    options: unknown;
    correctOption: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
    questionType: string;
    difficulty: number;
  },
  index: number,
): GeneratedStudyQuestionDto {
  const options =
    typeof q.options === "string"
      ? (() => {
          try {
            return JSON.parse(q.options as string);
          } catch {
            return [];
          }
        })()
      : ((q.options ?? []) as { id: string; text: string }[]);
  return {
    id: q.id,
    number: index + 1,
    questionText: q.questionText,
    options,
    correctAnswer: q.correctOption,
    explanation: q.explanation,
    sourceText: q.sourceText,
    sourceLine: q.sourceLine,
    questionType: q.questionType,
    difficulty: q.difficulty,
  };
}

export class PassageStudyServiceError extends Error {
  readonly code: StudioArtifactErrorCode;

  constructor(
    message: string,
    code: StudioArtifactErrorCode = "UPSTREAM_ERROR",
  ) {
    super(message);
    this.name = "PassageStudyServiceError";
    this.code = code;
  }
}
