import 'server-only';
import { Prisma } from "@/generated/prisma/client";
import { db } from "./client";
import { simpleSchedule } from "../spaced-repetition/scheduler";
import { findOrCreateDailySet, findOrCreateWeeklySet, addItemToSet } from "./vocabulary-set-queries";
import type { VocabularyItem, VocabularyOccurrence } from "@/generated/prisma/client";

// --- Helpers ---

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectType(text: string): "WORD" | "PHRASE" {
  return text.includes(" ") ? "PHRASE" : "WORD";
}

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

export async function upsertVocabularyItem(params: UpsertVocabularyItemParams): Promise<VocabularyItem> {
  const normalized = normalizeText(params.selectedText);
  const display = params.selectedText.trim();
  const type = detectType(normalized);

  const item = await db.vocabularyItem.upsert({
    where: {
      userId_normalizedText_targetLanguage_translation: {
        userId: params.userId,
        normalizedText: normalized,
        targetLanguage: params.targetLanguage,
        translation: params.translation,
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
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      source: params.source ?? "TRANSLATE",
      dictionaryEntryId: params.dictionaryEntryId ?? null,
      dictionarySenseId: params.dictionarySenseId ?? null,
      status: "NEW",
      savedCount: 1,
    },
  });

  // Create occurrence (idempotent via unique constraint)
  await createOccurrence(item.id, params.selectedText.trim(), params.sourceId, params.contextSentence);

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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
    where.normalizedText = { contains: normalizeText(params.search), mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    db.vocabularyItem.findMany({
      where,
      include: {
        occurrences: {
          select: { id: true, vocabularyItemId: true, sourceId: true, selectedText: true, contextSentence: true, createdAt: true },
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

  const { nextStatus, nextReviewDate } = simpleSchedule(item.status, params.isCorrect);

  return db.vocabularyItem.update({
    where: { id: params.itemId },
    data: {
      status: nextStatus,
      nextReviewAt: nextReviewDate,
      lastReviewedAt: new Date(),
    },
  });
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
