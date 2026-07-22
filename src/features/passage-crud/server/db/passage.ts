import "server-only";
import { prisma } from "@/lib/prisma";

export async function getUserPassages(userId: string) {
  return prisma.passage.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      cefrLevel: true,
      wordCount: true,
      createdAt: true,
      sourceType: true,
      filePath: true,
      youtubeUrl: true,
    },
  });
}


export async function deletePassage(passageId: string, userId: string) {
  return prisma.passage.update({
    where: { id: passageId, userId },
    data: { deletedAt: new Date() },
  });
}

export async function findOwnedPassage(userId: string, passageId: string) {
  return prisma.passage.findUnique({
    where: { id: passageId, userId, deletedAt: null },
  });
}
