import "server-only";
import {
  type StudioArtifact,
  type StudioArtifactType,
} from "../../lib/studio-artifact-types";
import type { GeneratedStudyQuestionDto } from "../../schemas/question";
import { NotFoundError } from "@/lib/errors";
import {
  deleteQuizResults,
  findArtifactQuestions,
  findStudioArtifactExists,
  findStudioArtifactForOwnership,
  findStudioArtifacts,
  upsertQuizResult,
} from "../db/studio-artifacts";

// Extends NotFoundError so the toHttp boundary maps it to 404 via a single
// instanceof check, while keeping the artifact-specific message + name.
export class ArtifactNotFoundError extends NotFoundError {
  constructor(artifactId: string) {
    super("Artifact");
    this.message = `Artifact not found or access denied: ${artifactId}`;
    this.name = "ArtifactNotFoundError";
  }
}

function parseQuestionOptions(value: unknown): GeneratedStudyQuestionDto["options"] {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GeneratedStudyQuestionDto["options"];
    } catch {
      return [];
    }
  }
  return (value ?? []) as GeneratedStudyQuestionDto["options"];
}

function toStudioArtifact(row: {
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
    status: row.status as StudioArtifact["status"],
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

export async function fetchStudioArtifacts(
  userId: string,
  passageId: string,
): Promise<{ artifacts: StudioArtifact[] }> {
  const rows = await findStudioArtifacts(userId, passageId);

  return { artifacts: rows.map((row) => toStudioArtifact(row)) };
}

export async function recordQuizResult(
  artifactId: string,
  userId: string,
  stats: { correctCount: number; totalQuestions: number },
): Promise<void> {
  // Accuracy Rate: round to 2 decimal places (e.g. 0.85)
  const accuracyRate =
    stats.totalQuestions > 0
      ? Math.round((stats.correctCount / stats.totalQuestions) * 100) / 100
      : 0;

  // We enforce ownership via the parent StudioArtifact.
  const artifact = await findStudioArtifactForOwnership(artifactId, userId);

  if (!artifact) {
    throw new ArtifactNotFoundError(artifactId);
  }

  await upsertQuizResult(artifactId, {
    correctCount: stats.correctCount,
    totalQuestions: stats.totalQuestions,
    accuracyRate,
  });
}

export async function resetQuizResult(
  artifactId: string,
  userId: string,
): Promise<void> {
  // We enforce ownership via the parent StudioArtifact.
  const artifact = await findStudioArtifactForOwnership(artifactId, userId);

  if (!artifact) {
    throw new ArtifactNotFoundError(artifactId);
  }

  await deleteQuizResults(artifactId);
}

export async function getArtifactQuestions(
  userId: string,
  artifactId: string,
): Promise<{ questions: GeneratedStudyQuestionDto[] }> {
  // Scope through the parent artifact's owner so a user can only read
  // questions for artifacts they own (prevents cross-user id probing).
  const questions = await findArtifactQuestions(artifactId, userId);

  if (questions.length === 0) {
    // Check if artifact exists but just has no questions yet, or if it doesn't exist/owned
    const artifact = await findStudioArtifactExists(artifactId, userId);
    if (!artifact) {
      throw new ArtifactNotFoundError(artifactId);
    }
  }

  const mapped: GeneratedStudyQuestionDto[] = questions.map((q, i) => ({
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

  return { questions: mapped };
}
