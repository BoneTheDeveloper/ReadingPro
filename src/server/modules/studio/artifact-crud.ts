import prisma from "@/server/lib/prisma";
import { AppError } from "@/server/lib/errors";
import { ProcessingStatus, StudioArtifactType } from "@/server/db/generated/enums";
import type { Prisma } from "@/server/db/generated/client";

export async function listArtifactsForUser(userId: string, passageId: string) {
  return prisma.studioArtifact.findMany({
    where: { passageId, userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      passageId: true,
      type: true,
      createdAt: true,
      progress: true,
      status: true,
    },
  });
}

export async function getArtifact(id: string, userId: string) {
  const artifact = await prisma.studioArtifact.findUnique({
    where: { id, userId },
    select: {
      id: true,
      passageId: true,
      type: true,
      content: true,
      progress: true,
      createdAt: true,
      status: true,
    },
  });
  if (!artifact) throw new AppError("artifact.not_found", "Artifact not found", { id: id });
  return artifact;
}

export async function createArtifact(input: {
  passageId: string;
  userId: string;
  type: StudioArtifactType;
  content?: Prisma.InputJsonValue;
  status?: ProcessingStatus;
}) {
  return prisma.studioArtifact.create({
    data: {
      passageId: input.passageId,
      userId: input.userId,
      type: input.type,
      content: input.content ?? undefined,
      status: input.status ?? "COMPLETED",
    },
  });
}

export async function updateArtifactStatus(args: {
  id: string;
  userId: string;
  status: ProcessingStatus;
  content?: Prisma.InputJsonValue;
}) {
  return prisma.studioArtifact.update({
    where: { id: args.id, userId: args.userId },
    data: {
      status: args.status,
      content: args.content ?? undefined,
    },
  });
}

export async function deleteArtifact(id: string, userId: string) {
  return prisma.studioArtifact.delete({
    where: { id, userId },
  });
}
