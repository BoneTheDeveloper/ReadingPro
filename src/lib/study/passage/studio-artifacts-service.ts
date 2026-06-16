import { db } from "@/lib/db/client";
import type { StudioArtifact, StudioArtifactType } from "@/lib/study/shared/studio-artifact-types";

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
  return { artifacts: rows.map(toStudioArtifact) };
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
