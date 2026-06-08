import { Prisma } from "@/generated/prisma/client";
import { db } from "./client";
import type { VocabularySetType, VocabularySet, VocabularySetItem } from "@/generated/prisma/client";

// --- Date helpers for set naming and period computation ---

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
}

function formatDailyName(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatWeeklyRange(monday: Date, sunday: Date): string {
  const startFormat = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endFormat = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startFormat} – ${endFormat}`;
}

// --- Types ---

export interface VocabularySetWithCount extends VocabularySet {
  _count: { setItems: number };
}

// --- Queries ---

export async function findOrCreateDailySet(userId: string, date?: Date): Promise<VocabularySet> {
  const now = date ?? new Date();
  const periodStart = startOfDay(now);
  const periodEnd = endOfDay(now);
  const name = formatDailyName(now);

  return db.vocabularySet.upsert({
    where: {
      userId_type_periodStart_periodEnd: {
        userId,
        type: "DAILY",
        periodStart,
        periodEnd,
      },
    },
    update: {},
    create: {
      userId,
      name,
      type: "DAILY",
      periodStart,
      periodEnd,
    },
  });
}

export async function findOrCreateWeeklySet(userId: string, date?: Date): Promise<VocabularySet> {
  const now = date ?? new Date();
  const monday = getMonday(now);
  const sunday = getSunday(now);
  const name = formatWeeklyRange(monday, sunday);

  return db.vocabularySet.upsert({
    where: {
      userId_type_periodStart_periodEnd: {
        userId,
        type: "WEEKLY",
        periodStart: monday,
        periodEnd: sunday,
      },
    },
    update: {},
    create: {
      userId,
      name,
      type: "WEEKLY",
      periodStart: monday,
      periodEnd: sunday,
    },
  });
}

export async function createManualSet(params: {
  userId: string;
  name: string;
}): Promise<VocabularySet> {
  return db.vocabularySet.create({
    data: {
      userId: params.userId,
      name: params.name,
      type: "MANUAL",
    },
  });
}

export async function listVocabularySets(params: {
  userId: string;
  type?: VocabularySetType;
}): Promise<VocabularySetWithCount[]> {
  const where: Prisma.VocabularySetWhereInput = { userId: params.userId };
  if (params.type) {
    where.type = params.type;
  }

  return db.vocabularySet.findMany({
    where,
    include: { _count: { select: { setItems: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateVocabularySet(params: {
  userId: string;
  setId: string;
  name: string;
}): Promise<VocabularySet> {
  const set = await db.vocabularySet.findUniqueOrThrow({
    where: { id: params.setId },
  });

  if (set.userId !== params.userId) {
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
  const set = await db.vocabularySet.findUniqueOrThrow({
    where: { id: params.setId },
  });

  if (set.userId !== params.userId) {
    throw new Error(`No vocabulary set found for user`);
  }

  await db.vocabularySet.delete({
    where: { id: params.setId },
  });
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
    // P2002 = unique constraint — item already in set, safe to ignore
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await db.vocabularySetItem.findUniqueOrThrow({
        where: {
          vocabularySetId_vocabularyItemId: {
            vocabularySetId: params.setId,
            vocabularyItemId: params.itemId,
          },
        },
      });
      return existing;
    }
    throw error;
  }
}

export async function removeItemFromSet(params: {
  userId: string;
  setId: string;
  itemId: string;
}): Promise<void> {
  const set = await db.vocabularySet.findUniqueOrThrow({
    where: { id: params.setId },
  });

  if (set.userId !== params.userId) {
    throw new Error(`No vocabulary set found for user`);
  }

  await db.vocabularySetItem.delete({
    where: {
      vocabularySetId_vocabularyItemId: {
        vocabularySetId: params.setId,
        vocabularyItemId: params.itemId,
      },
    },
  });
}
