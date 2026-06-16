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
}): StudioArtifact {
  return {
    id: row.id,
    type: row.type as StudioArtifactType,
    passageId: row.passageId,
    title: row.title,
    status: row.status as StudioArtifact["status"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function fetchStudioArtifacts(
  userId: string,
  passageId: string,
): Promise<{ artifacts: StudioArtifact[] }> {
  const rows = await db.studioArtifact.findMany({
    where: { passageId, userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, passageId: true, title: true, status: true, createdAt: true, updatedAt: true },
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
    select: { id: true, type: true, passageId: true, title: true, status: true, createdAt: true, updatedAt: true },
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
