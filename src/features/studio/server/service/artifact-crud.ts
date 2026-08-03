import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/error/app-error";
import { ProcessingStatus, StudioArtifactType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

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
  if (!artifact) throw new NotFoundError("Artifact", id);
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

// Atomic status update — used by the after() callback. Only the processing
// step writes status: COMPLETED/FAILED. Error-status invariant: FAILED
// requires statusError; COMPLETED clears it.
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
