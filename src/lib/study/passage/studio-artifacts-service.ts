import { db } from "@/lib/db/client";
import {
  type StudioArtifact,
  type StudioArtifactType,
} from "@/lib/study/shared/studio-artifact-types";

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
    quizResult: row.quizResult ? {
      completedAt: row.quizResult.completedAt.toISOString(),
      correctCount: row.quizResult.correctCount,
      totalQuestions: row.quizResult.totalQuestions,
      accuracyRate: row.quizResult.accuracyRate,
    } : undefined,
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
  const accuracyRate = stats.totalQuestions > 0
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
