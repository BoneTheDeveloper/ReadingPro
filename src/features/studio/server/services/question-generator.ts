import "server-only";
import { generateObject } from "ai";
import { moduleLog } from "@/lib/logger";
import { getOwnedPassage } from "@/features/passage-crud";
import {
  questionGenerationDataSchema,
  type GeneratedQuestionDto,
  type QuestionGenerationData,
} from "@/features/studio/schemas/question";
import {
  type StudioArtifact,
  type StudioArtifactErrorCode,
  type StudioArtifactStatus,
  type StudioArtifactType,
} from "@/features/studio/schemas/studio";
import {
  createStudioArtifactWithQuestions,
  findExistingStudioArtifact,
} from "@/features/studio/server/db/studio-artifact-questions";

const log = moduleLog("studio-panel:questions");

const QUESTION_SYSTEM_PROMPT = `You are an expert English language educator. Generate multiple-choice reading comprehension questions that: test understanding (not memory), have clear answers from text, include line number citations, range factual to inferential, cover different parts of passage. Wrong answers should be plausible but clearly incorrect.`;

/**
 * Lower-level SDK call used by the Inngest job. Lets the AI SDK throw
 * (timeout, schema-validation, network) so callers decide how to react.
 */
export async function generateComprehensionQuestions(
  passage: string,
  questionCount: number = 5,
): Promise<QuestionGenerationData> {
  const numberedPassage = passage
    .slice(0, 10_000)
    .split("\n")
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");

  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: questionGenerationDataSchema,
    abortSignal: AbortSignal.timeout(45_000),
    system: QUESTION_SYSTEM_PROMPT,
    prompt: `Generate ${questionCount} reading comprehension questions for this passage:\n\n${numberedPassage}`,
  });

  return object;
}

export async function generateQuestionsForPassage(
  userId: string,
  passageId: string,
  artifactId: string,
): Promise<{ artifact: StudioArtifact; questions: GeneratedQuestionDto[] }> {
  const passage = await getOwnedPassage(userId, passageId);
  if (!passage) {
    throw new QuestionServiceError("Passage not found", "PASSAGE_NOT_FOUND");
  }

  const existing = await findExistingStudioArtifact(artifactId, userId);
  if (existing) {
    return {
      artifact: rowToArtifact(existing),
      questions: existing.questions.map(rowToQuestionDto),
    };
  }

  let data: QuestionGenerationData;
  try {
    data = await generateComprehensionQuestions(passage.content, 5);
  } catch (err) {
    const code = err instanceof Error && err.name === "TimeoutError"
      ? "TIMEOUT"
      : "GENERATION_FAILED";
    throw new QuestionServiceError(
      "Question generation failed — try again",
      code,
    );
  }

  const valid = data.questions.filter((q) =>
    q.options.some((o) => o.id === q.correctAnswer),
  );
  if (valid.length === 0) {
    throw new QuestionServiceError(
      "No valid questions generated — try again",
      "NO_QUESTIONS",
    );
  }
  if (valid.length < data.questions.length) {
    log.warn(
      { context: { kept: valid.length, total: data.questions.length } },
      "Dropped invalid questions",
    );
  }

  const { artifact, questions: rows } = await createStudioArtifactWithQuestions({
    artifactId,
    passageId,
    userId,
    title: passage.title,
    questions: valid.map((q) => ({
      questionText: q.questionText,
      options: q.options,
      correctOption: q.correctAnswer,
      sourceText: q.sourceText,
      sourceLine: q.sourceLine,
      explanation: q.explanation,
      difficulty: q.difficulty,
    })),
  });

  return { artifact: rowToArtifact(artifact), questions: rows.map(rowToQuestionDto) };
}

function rowToArtifact(row: {
  id: string;
  type: string;
  passageId: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  questionResult?: {
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
    questionResult: row.questionResult
      ? {
          completedAt: row.questionResult.completedAt.toISOString(),
          correctCount: row.questionResult.correctCount,
          totalQuestions: row.questionResult.totalQuestions,
          accuracyRate: row.questionResult.accuracyRate,
        }
      : undefined,
  };
}

function rowToQuestionDto(
  q: {
    id: string;
    questionText: string;
    options: unknown;
    correctOption: string;
    sourceText: string;
    sourceLine: number;
    explanation: string;
    difficulty: number;
  },
  index: number,
): GeneratedQuestionDto {
  const options = (q.options ?? []) as GeneratedQuestionDto["options"];
  return {
    id: q.id,
    number: index + 1,
    questionText: q.questionText,
    options,
    correctAnswer: q.correctOption,
    explanation: q.explanation,
    sourceText: q.sourceText,
    sourceLine: q.sourceLine,
    difficulty: q.difficulty,
  };
}

export class QuestionServiceError extends Error {
  readonly code: StudioArtifactErrorCode;

  constructor(
    message: string,
    code: StudioArtifactErrorCode = "UPSTREAM_ERROR",
  ) {
    super(message);
    this.name = "QuestionServiceError";
    this.code = code;
  }
}
