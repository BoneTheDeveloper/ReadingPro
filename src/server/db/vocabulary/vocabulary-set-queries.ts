import "server-only";
import { db } from "@/server/db/client";
import { withUserProfile } from "@/server/auth/sync-user";
import type {
  VocabularySet,
  VocabularySetItem,
} from "@/generated/prisma/client";

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

  const existing = await db.vocabularySet.findFirst({
    where: {
      userId,
      type,
      periodStart,
      periodEnd,
    },
  });

  if (existing) {
    return existing;
  }

  const prefix = type === "DAILY" ? "Daily" : "Weekly";
  const dateStr = periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return withUserProfile(userId, () =>
    db.vocabularySet.create({
      data: {
        userId,
        name: `${prefix} - ${dateStr}`,
        type,
        periodStart,
        periodEnd,
      },
    }),
  );
}

export async function listVocabularySets(params: {
  userId: string;
  type?: "MANUAL" | "DAILY" | "WEEKLY";
}): Promise<VocabularySet[]> {
  const query: Parameters<typeof db.vocabularySet.findMany>[0] = {
    where: {
      userId: params.userId,
    },
    include: {
      setItems: {
        select: { id: true, vocabularyItemId: true, addedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  };

  if (params.type) {
    query.where = { ...query.where, type: params.type };
  }

  return db.vocabularySet.findMany(query);
}

export async function createManualSet(params: {
  userId: string;
  name: string;
}): Promise<VocabularySet> {
  return withUserProfile(params.userId, () =>
    db.vocabularySet.create({
      data: {
        userId: params.userId,
        name: params.name,
        type: "MANUAL",
        periodStart: null,
        periodEnd: null,
      },
    }),
  );
}

export async function updateVocabularySet(params: {
  userId: string;
  setId: string;
  name: string;
}): Promise<VocabularySet> {
  const existing = await db.vocabularySet.findUnique({
    where: { id: params.setId },
  });

  if (!existing || existing.userId !== params.userId) {
    throw new Error(`No vocabulary set found for user`);
  }

  return db.vocabularySet.update({
    where: { id: params.setId },
    data: { name: params.name },
  });
}

export async function deleteVocabularySet(params: {
  userId: string;
  setId: string;
}): Promise<void> {
  const existing = await db.vocabularySet.findUnique({
    where: { id: params.setId },
  });

  if (!existing || existing.userId !== params.userId) {
    throw new Error(`No vocabulary set found for user`);
  }

  await db.vocabularySet.delete({
    where: { id: params.setId },
  });
}

export async function verifySetOwnership(
  userId: string,
  setId: string,
): Promise<void> {
  const existing = await db.vocabularySet.findUnique({
    where: { id: setId },
  });

  if (!existing || existing.userId !== userId) {
    throw new Error(`No vocabulary set found for user`);
  }
}

export async function addItemToSet(params: {
  setId: string;
  itemId: string;
}): Promise<VocabularySetItem> {
  try {
    return await db.vocabularySetItem.create({
      data: {
        vocabularySetId: params.setId,
        vocabularyItemId: params.itemId,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      const existing = await db.vocabularySetItem.findUnique({
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

  await db.vocabularySetItem.deleteMany({
    where: {
      vocabularySetId: params.setId,
      vocabularyItemId: params.itemId,
    },
  });
}
