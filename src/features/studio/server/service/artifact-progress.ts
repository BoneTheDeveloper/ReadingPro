import "server-only";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export async function updateArtifactProgress(
  id: string,
  userId: string,
  progress: Prisma.InputJsonValue,
) {
  return prisma.studioArtifact.update({
    where: { id, userId },
    data: { progress },
    select: { id: true },
  });
}
