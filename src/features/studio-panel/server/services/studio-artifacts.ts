import "server-only";
import * as Sentry from "@sentry/nextjs";
import {
  type StudioArtifact,
  type StudioArtifactType,
} from "@/features/studio-panel/schemas/studio-artifact";
import type { GeneratedQuestionDto } from "@/features/studio-panel/schemas/question";
import {
  deleteQuizResults,
  findArtifactQuestions,
  findStudioArtifactExists,
  findStudioArtifactForOwnership,
  findStudioArtifacts,
  upsertQuizResult,
} from "../db/studio-artifacts";

// Simple factory for artifact not found errors
function artifactNotFound(artifactId: string): Error {
  return new Error(`Artifact not found or access denied: ${artifactId}`);
}

function parseQuestionOptions(value: unknown): GeneratedQuestionDto["options"] {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GeneratedQuestionDto["options"];
    } catch {
      return [];
    }
  }
  return (value ?? []) as GeneratedQuestionDto["options"];
}

function toStudioArtifact(row: {
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
    status: row.status as StudioArtifact["status"],
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

export async function fetchStudioArtifacts(
  userId: string,
  passageId: string,
): Promise<{ artifacts: StudioArtifact[] }> {
  // DIAGNOSTIC BREADCRUMB — phase 2 fan-out trace; remove after diagnosis
  Sentry.addBreadcrumb({
    category: "artifact.fetch",
    message: "fetchStudioArtifacts called",
    data: { passageId, userId },
  });

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
    throw artifactNotFound(artifactId);
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
    throw artifactNotFound(artifactId);
  }

  await deleteQuizResults(artifactId);
}

export async function getArtifactQuestions(
  userId: string,
  artifactId: string,
): Promise<{ questions: GeneratedQuestionDto[] }> {
  // Scope through the parent artifact's owner so a user can only read
  // questions for artifacts they own (prevents cross-user id probing).
  const questions = await findArtifactQuestions(artifactId, userId);

  if (questions.length === 0) {
    // Check if artifact exists but just has no questions yet, or if it doesn't exist/owned
    const artifact = await findStudioArtifactExists(artifactId, userId);
    if (!artifact) {
      throw artifactNotFound(artifactId);
    }
  }

  const mapped: GeneratedQuestionDto[] = questions.map((q, i) => ({
    id: q.id,
    number: i + 1,
    questionText: q.questionText,
    options: parseQuestionOptions(q.options),
    correctAnswer: q.correctOption,
    sourceText: q.sourceText,
    sourceLine: q.sourceLine,
    explanation: q.explanation,
    difficulty: q.difficulty,
  }));

  return { questions: mapped };
}
