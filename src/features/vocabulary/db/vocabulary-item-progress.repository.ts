import "server-only";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/http/route-errors";
import { simpleSchedule } from "@/features/vocabulary/db/scheduler";
import type { VocabularyItem } from "@/generated/prisma/client";

export async function updateVocabularyStatus(params: {
  userId: string;
  itemId: string;
  status: "NEW" | "LEARNING" | "MASTERED";
}): Promise<VocabularyItem> {
  const item = await prisma.vocabularyItem.findUnique({
    where: { id: params.itemId },
  });

  if (!item || item.userId !== params.userId) {
    throw new NotFoundError("Vocabulary item");
  }

  return prisma.vocabularyItem.update({
    where: { id: params.itemId },
    data: { status: params.status },
  });
}

export async function reviewVocabularyItem(params: {
  userId: string;
  itemId: string;
  isCorrect: boolean;
}): Promise<VocabularyItem> {
  const item = await prisma.vocabularyItem.findUnique({
    where: { id: params.itemId },
  });

  if (!item || item.userId !== params.userId) {
    throw new NotFoundError("Vocabulary item");
  }

  const { nextStatus, nextReviewDate } = simpleSchedule(
    item.status,
    params.isCorrect,
  );

  return prisma.vocabularyItem.update({
    where: { id: params.itemId },
    data: {
      status: nextStatus,
      nextReviewAt: nextReviewDate,
      lastReviewedAt: new Date(),
    },
  });
}

export async function getVocabularyStats(userId: string): Promise<{
  total: number;
  new: number;
  learning: number;
  known: number;
}> {
  const [total, newCount, learningCount, knownCount] = await Promise.all([
    prisma.vocabularyItem.count({ where: { userId } }),
    prisma.vocabularyItem.count({ where: { userId, status: "NEW" } }),
    prisma.vocabularyItem.count({ where: { userId, status: "LEARNING" } }),
    prisma.vocabularyItem.count({ where: { userId, status: "MASTERED" } }),
  ]);
  return { total, new: newCount, learning: learningCount, known: knownCount };
}
