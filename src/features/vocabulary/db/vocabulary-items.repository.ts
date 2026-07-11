import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { withUserProfile } from "@/features/users/db/sync-user.repository";
import { findOwnedPassage } from "@/features/passage/db/passage-study.repository";
import {
  findOrCreateDailySet,
  findOrCreateWeeklySet,
  addItemToSet,
} from "@/features/vocabulary/db/vocabulary-sets.repository";

// Text normalization helpers (vocabulary-specific, used locally)
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
function detectType(text: string): "WORD" | "PHRASE" {
  return text.includes(" ") ? "PHRASE" : "WORD";
}
import type {
  VocabularyItem,
  VocabularyOccurrence,
} from "@/generated/prisma/client";


export interface VocabularyItemWithOccurrences extends VocabularyItem {
  occurrences: VocabularyOccurrence[];
}

export interface UpsertVocabularyItemParams {
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

export async function findOwnedSource(userId: string, sourceId: string) {
  return findOwnedPassage(userId, sourceId);
}

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
    prisma.vocabularyItem.upsert({
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

  await createOccurrence(
    item.id,
    params.selectedText.trim(),
    params.sourceId,
    params.contextSentence,
  );

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
    await prisma.vocabularyOccurrence.create({
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
    prisma.vocabularyItem.findMany({
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
    prisma.vocabularyItem.count({ where }),
  ]);

  return { items, total };
}

export async function deleteVocabularyItem(params: {
  userId: string;
  itemId: string;
}): Promise<void> {
  const item = await prisma.vocabularyItem.findUnique({
    where: { id: params.itemId },
  });

  if (!item || item.userId !== params.userId) {
    throw new NotFoundError("Vocabulary item");
  }

  await prisma.vocabularyItem.delete({
    where: { id: params.itemId },
  });
}
