import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { simpleSchedule } from "@/server/modules/spaced-repetition/scheduler";
import {
  findOrCreateDailySet,
  findOrCreateWeeklySet,
  addItemToSet,
} from "./vocabulary-set-queries";
import { withUserProfile } from "@/server/auth/sync-user";
import { normalizeText, detectType } from "./vocabulary-text-utils";
import type {
  VocabularyItem,
  VocabularyOccurrence,
} from "@/generated/prisma/client";

// --- Helpers ---

export { normalizeText, detectType } from "./vocabulary-text-utils";

// --- Types ---

export interface VocabularyItemWithOccurrences extends VocabularyItem {
  occurrences: VocabularyOccurrence[];
}

interface UpsertVocabularyItemParams {
  userId: string;
  selectedText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceId?: string;
  contextSentence?: string;
  source?: "TRANSLATE" | "DICTIONARY";
  dictionaryEntryId?: string;
  dictionarySenseId?: string;
}

// --- Queries ---

export async function upsertVocabularyItem(
  params: UpsertVocabularyItemParams,
): Promise<VocabularyItem> {
  const normalized = normalizeText(params.selectedText);
  const display = params.selectedText.trim();
  const type = detectType(normalized);
  const normalizedTranslation = normalizeText(params.translation);

  // Only this write carries the userId FK; the occurrence + set writes below
  // self-heal via their own wrappers, so wrap just the item upsert.
  const item = await withUserProfile(params.userId, () =>
    db.vocabularyItem.upsert({
      where: {
        userId_normalizedText_targetLanguage_normalizedTranslation: {
          userId: params.userId,
          normalizedText: normalized,
          targetLanguage: params.targetLanguage,
          normalizedTranslation,
        },
      },
      update: {
        savedCount: { increment: 1 },
        updatedAt: new Date(),
        // Preserve status, nextReviewAt, lastReviewedAt on re-save
      },
      create: {
        userId: params.userId,
        normalizedText: normalized,
        displayText: display,
        type,
        translation: params.translation,
        normalizedTranslation,
        sourceLanguage: params.sourceLanguage,
        targetLanguage: params.targetLanguage,
        source: params.source ?? "TRANSLATE",
        dictionaryEntryId: params.dictionaryEntryId ?? null,
        dictionarySenseId: params.dictionarySenseId ?? null,
        status: "NEW",
        savedCount: 1,
      },
    }),
  );

  // Create occurrence (idempotent via unique constraint)
  await createOccurrence(
    item.id,
    params.selectedText.trim(),
    params.sourceId,
    params.contextSentence,
  );

  // Add to daily + weekly sets
  const [dailySet, weeklySet] = await Promise.all([
    findOrCreateDailySet(params.userId),
    findOrCreateWeeklySet(params.userId),
  ]);

  await Promise.all([
    addItemToSet({ setId: dailySet.id, itemId: item.id }),
    addItemToSet({ setId: weeklySet.id, itemId: item.id }),
  ]);

  return item;
}

async function createOccurrence(
  vocabularyItemId: string,
  selectedText: string,
  sourceId?: string,
  contextSentence?: string,
): Promise<void> {
  try {
    await db.vocabularyOccurrence.create({
      data: {
        vocabularyItemId,
        sourceId: sourceId ?? null,
        selectedText,
        contextSentence: contextSentence ?? null,
      },
    });
  } catch (error: unknown) {
    // P2002 = unique constraint violation — occurrence already exists, safe to ignore
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

export async function listVocabularyItems(params: {
  userId: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: VocabularyItemWithOccurrences[]; total: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const where: Prisma.VocabularyItemWhereInput = { userId: params.userId };

  if (params.status) {
    where.status = params.status;
  }

  if (params.search) {
    where.normalizedText = {
      contains: normalizeText(params.search),
      mode: "insensitive",
    };
  }

  const [items, total] = await Promise.all([
    db.vocabularyItem.findMany({
      where,
      include: {
        occurrences: {
          select: {
            id: true,
            vocabularyItemId: true,
            sourceId: true,
            selectedText: true,
            contextSentence: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.vocabularyItem.count({ where }),
  ]);

  return { items, total };
}

export async function updateVocabularyStatus(params: {
  userId: string;
  itemId: string;
  status: "NEW" | "LEARNING" | "MASTERED";
}): Promise<VocabularyItem> {
  const item = await db.vocabularyItem.findUniqueOrThrow({
    where: { id: params.itemId },
  });

  if (item.userId !== params.userId) {
    throw new Error(`No vocabulary item found for user`);
  }

  return db.vocabularyItem.update({
    where: { id: params.itemId },
    data: { status: params.status },
  });
}

export async function reviewVocabularyItem(params: {
  userId: string;
  itemId: string;
  isCorrect: boolean;
}): Promise<VocabularyItem> {
  const item = await db.vocabularyItem.findUniqueOrThrow({
    where: { id: params.itemId },
  });

  if (item.userId !== params.userId) {
    throw new Error(`No vocabulary item found for user`);
  }

  const { nextStatus, nextReviewDate } = simpleSchedule(
    item.status,
    params.isCorrect,
  );

  return db.vocabularyItem.update({
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
    db.vocabularyItem.count({ where: { userId } }),
    db.vocabularyItem.count({ where: { userId, status: "NEW" } }),
    db.vocabularyItem.count({ where: { userId, status: "LEARNING" } }),
    db.vocabularyItem.count({ where: { userId, status: "MASTERED" } }),
  ]);
  return { total, new: newCount, learning: learningCount, known: knownCount };
}

export async function deleteVocabularyItem(params: {
  userId: string;
  itemId: string;
}): Promise<void> {
  const item = await db.vocabularyItem.findUniqueOrThrow({
    where: { id: params.itemId },
  });

  if (item.userId !== params.userId) {
    throw new Error(`No vocabulary item found for user`);
  }

  await db.vocabularyItem.delete({
    where: { id: params.itemId },
  });
}
