import "server-only";
import { db } from "@/server/lib/db";
import {
  type StudioArtifact,
  type StudioArtifactType,
} from "@/contracts/study/studio-artifact-types";
import type { QuestionData } from "@/features/study/shared/types";

export class ArtifactNotFoundError extends Error {
  constructor(artifactId: string) {
    super(`Artifact not found or access denied: ${artifactId}`);
    this.name = "ArtifactNotFoundError";
  }
}

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
  const rows = await db.studioArtifact.findMany({
    where: { passageId, userId },
    orderBy: { createdAt: "desc" },
    include: { quizResult: true },
  });

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
  const artifact = await db.studioArtifact.findUnique({
    where: { id: artifactId, userId },
    select: { id: true },
  });

  if (!artifact) {
    throw new Error("Artifact not found or access denied");
  }

  await db.quizResult.upsert({
    where: { artifactId },
    create: {
      artifactId,
      correctCount: stats.correctCount,
      totalQuestions: stats.totalQuestions,
      accuracyRate,
    },
    update: {
      correctCount: stats.correctCount,
      totalQuestions: stats.totalQuestions,
      accuracyRate,
      completedAt: new Date(),
    },
  });
}

export async function resetQuizResult(
  artifactId: string,
  userId: string,
): Promise<void> {
  // We enforce ownership via the parent StudioArtifact.
  const artifact = await db.studioArtifact.findUnique({
    where: { id: artifactId, userId },
    select: { id: true },
  });

  if (!artifact) {
    throw new Error("Artifact not found or access denied");
  }

  await db.quizResult.deleteMany({
    where: { artifactId },
  });
}

export async function getArtifactQuestions(
  userId: string,
  artifactId: string,
): Promise<{ questions: QuestionData[] }> {
  // Scope through the parent artifact's owner so a user can only read
  // questions for artifacts they own (prevents cross-user id probing).
  const questions = await db.question.findMany({
    where: { artifactId, artifact: { userId } },
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
      where: { id: artifactId, userId },
    });
    if (!artifact) {
      throw new ArtifactNotFoundError(artifactId);
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

  return { questions: mapped };
}
