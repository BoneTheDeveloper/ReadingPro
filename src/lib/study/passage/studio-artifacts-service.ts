import { db } from "@/lib/db/client";
import {
  GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS,
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

  // Reconcile orphaned generations: a "generating" row only leaves that state via
  // the client that started it, so one that has outlived the orphan timeout is
  // stranded (interrupted client) and would otherwise lock the action forever.
  const cutoff = Date.now() - GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS;
  const orphanedIds = rows
    .filter((row) => row.status === "generating" && row.updatedAt.getTime() < cutoff)
    .map((row) => row.id);

  if (orphanedIds.length > 0) {
    await db.studioArtifact.updateMany({
      where: { id: { in: orphanedIds }, userId, status: "generating" },
      data: { status: "failed" },
    });
  }

  const orphanedIdSet = new Set(orphanedIds);
  return {
    artifacts: rows.map((row) =>
      orphanedIdSet.has(row.id) ? toStudioArtifact({ ...row, status: "failed" }) : toStudioArtifact(row),
    ),
  };
}

export async function createStudioArtifact(input: {
  id: string;
  passageId: string;
  userId: string;
  type: StudioArtifactType;
  title: string;
}): Promise<StudioArtifact> {
  const row = await db.studioArtifact.create({
    data: {
      id: input.id,
      passageId: input.passageId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      status: "generating",
    },
    include: { quizResult: true },
  });
  return toStudioArtifact(row);
}

export async function completeStudioArtifact(
  artifactId: string,
  userId: string,
): Promise<void> {
  await db.studioArtifact.updateMany({
    where: { id: artifactId, userId },
    data: { status: "done" },
  });
}

export async function failStudioArtifact(artifactId: string, userId: string): Promise<void> {
  await db.studioArtifact.updateMany({
    where: { id: artifactId, userId },
    data: { status: "failed" },
  });
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
