import "server-only";
import { prisma } from "@/lib/prisma";

export async function findStudioArtifacts(userId: string, passageId: string) {
  return prisma.studioArtifact.findMany({
    where: { passageId, userId },
    orderBy: { createdAt: "desc" },
    include: { quizResult: true },
  });
}

export async function findStudioArtifactForOwnership(
  artifactId: string,
  userId: string,
) {
  return prisma.studioArtifact.findUnique({
    where: { id: artifactId, userId },
    select: { id: true },
  });
}

export async function upsertQuizResult(
  artifactId: string,
  stats: { correctCount: number; totalQuestions: number; accuracyRate: number },
) {
  return prisma.quizResult.upsert({
    where: { artifactId },
    create: {
      artifactId,
      correctCount: stats.correctCount,
      totalQuestions: stats.totalQuestions,
      accuracyRate: stats.accuracyRate,
    },
    update: {
      correctCount: stats.correctCount,
      totalQuestions: stats.totalQuestions,
      accuracyRate: stats.accuracyRate,
      completedAt: new Date(),
    },
  });
}

export async function deleteQuizResults(artifactId: string) {
  return prisma.quizResult.deleteMany({
    where: { artifactId },
  });
}

export async function findArtifactQuestions(artifactId: string, userId: string) {
  return prisma.question.findMany({
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
      difficulty: true,
    },
  });
}

export async function findStudioArtifactExists(
  artifactId: string,
  userId: string,
) {
  return prisma.studioArtifact.findFirst({
    where: { id: artifactId, userId },
  });
}
