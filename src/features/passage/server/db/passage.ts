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
    },
  });
}

export async function getUserPassageOverview(userId: string) {
  const where = { userId, deletedAt: null };

  const [summary, recentPassages] = await Promise.all([
    prisma.passage.aggregate({
      where,
      _count: { _all: true },
      _sum: { wordCount: true },
    }),
    prisma.passage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        content: true,
        cefrLevel: true,
        wordCount: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    recentPassages,
    totalPassages: summary._count._all,
    totalWords: summary._sum.wordCount ?? 0,
  };
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
