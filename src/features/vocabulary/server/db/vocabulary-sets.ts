import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  VocabularySet,
  VocabularySetItem,
  VocabularySetType,
} from "@/generated/prisma/client";

export type VocabularySetWithCount = VocabularySet & {
  _count: { vocabularySetItems: number };
};

function getPeriodBounds(type: "DAILY" | "WEEKLY"): {
  periodStart: Date;
  periodEnd: Date;
} {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (type === "DAILY") {
    const periodEnd = new Date(startOfDay);
    periodEnd.setDate(periodEnd.getDate() + 1);
    return { periodStart: startOfDay, periodEnd };
  } else {
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(startOfDay);
    monday.setDate(monday.getDate() - diff);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 7);

    return { periodStart: monday, periodEnd: sunday };
  }
}

export async function findOrCreateDailySet(
  userId: string,
): Promise<VocabularySet> {
  return findOrCreateSetByType(userId, "DAILY");
}

export async function findOrCreateWeeklySet(
  userId: string,
): Promise<VocabularySet> {
  return findOrCreateSetByType(userId, "WEEKLY");
}

async function findOrCreateSetByType(
  userId: string,
  type: "DAILY" | "WEEKLY",
): Promise<VocabularySet> {
  const { periodStart, periodEnd } = getPeriodBounds(type);

  const existing = await prisma.vocabularySet.findFirst({
    where: { userId, type, periodStart, periodEnd },
  });

  if (existing) {
    return existing;
  }

  const prefix = type === "DAILY" ? "Daily" : "Weekly";
  const dateStr = periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return prisma.vocabularySet.create({
    data: {
      userId,
      name: `${prefix} - ${dateStr}`,
      type,
      periodStart,
      periodEnd,
      updatedAt: new Date(),
    },
  });
}

export async function listVocabularySets(params: {
  userId: string;
  type?: VocabularySetType;
}): Promise<VocabularySetWithCount[]> {
  const query: Parameters<typeof prisma.vocabularySet.findMany>[0] = {
    where: { userId: params.userId },
    include: { _count: { select: { vocabularySetItems: true } } },
    orderBy: { updatedAt: "desc" },
  };

  if (params.type) {
    query.where = { ...query.where, type: params.type };
  }

  return prisma.vocabularySet.findMany(query) as Promise<VocabularySetWithCount[]>;
}

export async function createManualSet(params: {
  userId: string;
  name: string;
}): Promise<VocabularySetWithCount> {
  return prisma.vocabularySet.create({
    data: {
      userId: params.userId,
      name: params.name,
      type: "MANUAL",
      periodStart: null,
      periodEnd: null,
      updatedAt: new Date(),
    },
    include: { _count: { select: { vocabularySetItems: true } } },
  });
}

export async function updateVocabularySet(params: {
  userId: string;
  setId: string;
  name: string;
}): Promise<VocabularySetWithCount> {
  const existing = await prisma.vocabularySet.findUnique({
    where: { id: params.setId },
  });

  if (!existing || existing.userId !== params.userId) {
    throw new Error("Vocabulary set not found");
  }

  return prisma.vocabularySet.update({
    where: { id: params.setId },
    data: { name: params.name },
    include: { _count: { select: { vocabularySetItems: true } } },
  });
}

export async function deleteVocabularySet(params: {
  userId: string;
  setId: string;
}): Promise<void> {
  const existing = await prisma.vocabularySet.findUnique({
    where: { id: params.setId },
  });

  if (!existing || existing.userId !== params.userId) {
    throw new Error("Vocabulary set not found");
  }

  await prisma.vocabularySet.delete({
    where: { id: params.setId },
  });
}

export async function verifySetOwnership(
  userId: string,
  setId: string,
): Promise<void> {
  const existing = await prisma.vocabularySet.findUnique({
    where: { id: setId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error("Vocabulary set not found");
  }
}

export async function addItemToSet(params: {
  setId: string;
  itemId: string;
}): Promise<VocabularySetItem> {
  try {
    return await prisma.vocabularySetItem.create({
      data: {
        vocabularySetId: params.setId,
        vocabularyItemId: params.itemId,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      const existing = await prisma.vocabularySetItem.findUnique({
        where: {
          vocabularySetId_vocabularyItemId: {
            vocabularySetId: params.setId,
            vocabularyItemId: params.itemId,
          },
        },
      });
      if (existing) return existing;
    }
    throw error;
  }
}

export async function removeItemFromSet(params: {
  userId: string;
  setId: string;
  itemId: string;
}): Promise<void> {
  await verifySetOwnership(params.userId, params.setId);

  await prisma.vocabularySetItem.deleteMany({
    where: {
      vocabularySetId: params.setId,
      vocabularyItemId: params.itemId,
    },
  });
}
