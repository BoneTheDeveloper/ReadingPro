import { Prisma } from "@/server/db/generated/client";
import prisma from "@/server/lib/prisma";

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
