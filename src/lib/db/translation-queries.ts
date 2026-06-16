import 'server-only';
import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./client";

interface TranslationKeyInput {
  userId: string;
  sourceId: string;
  selectedText: string;
  contextSentence: string;
  targetLanguage: string;
}

interface TranslationCacheInput extends TranslationKeyInput {
  sourceLanguage: string;
  provider: string;
  response: Prisma.InputJsonValue;
}

interface TranslationHistoryInput extends TranslationCacheInput {
  translation: string;
}

interface VocabularyInput {
  userId: string;
  selectedText: string;
  translation: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceId?: string;
  contextSentence?: string;
  type?: string;
}

function stableHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

export function normalizeDictionaryTerm(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function buildTranslationCacheKey(input: TranslationKeyInput) {
  return stableHash({
    userId: input.userId,
    sourceId: input.sourceId,
    selectedText: input.selectedText,
    contextSentence: input.contextSentence,
    targetLanguage: input.targetLanguage,
  });
}

export function buildVocabularyKey(input: Omit<VocabularyInput, "translation" | "sourceLanguage" | "type">) {
  return stableHash({
    userId: input.userId,
    selectedText: input.selectedText,
    targetLanguage: input.targetLanguage,
  });
}

export async function getOwnedTranslationSource(userId: string, sourceId: string) {
  return db.passage.findUnique({
    where: { id: sourceId, userId, deletedAt: null },
    select: { id: true, title: true },
  });
}

export async function getTranslationCache(cacheKey: string) {
  return db.translationCache.findUnique({
    where: { cacheKey },
    select: { provider: true, response: true },
  });
}

export async function upsertTranslationCache(input: TranslationCacheInput) {
  const cacheKey = buildTranslationCacheKey(input);

  return db.translationCache.upsert({
    where: { cacheKey },
    update: {
      provider: input.provider,
      response: input.response,
    },
    create: {
      cacheKey,
      userId: input.userId,
      sourceId: input.sourceId,
      selectedText: input.selectedText,
      contextSentence: input.contextSentence,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      mode: "quick",
      provider: input.provider,
      response: input.response,
    },
  });
}

export async function createTranslationHistory(input: TranslationHistoryInput) {
  return db.translationHistory.create({
    data: {
      userId: input.userId,
      sourceId: input.sourceId,
      selectedText: input.selectedText,
      contextSentence: input.contextSentence,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      mode: "quick",
      provider: input.provider,
      translation: input.translation,
      response: input.response,
    },
  });
}

export async function saveVocabularyItem(input: VocabularyInput) {
  const normalizedText = input.selectedText.toLowerCase().replace(/\s+/g, " ").trim();

  const item = await db.vocabularyItem.upsert({
    where: {
      userId_normalizedText_targetLanguage_translation: {
        userId: input.userId,
        normalizedText,
        targetLanguage: input.targetLanguage,
        translation: input.translation,
      },
    },
    update: {
      translation: input.translation,
      type: input.type ?? "WORD",
      savedCount: { increment: 1 },
    },
    create: {
      userId: input.userId,
      normalizedText,
      displayText: input.selectedText,
      translation: input.translation,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      type: input.type ?? "WORD",
      source: "TRANSLATE",
    },
    select: {
      id: true,
      displayText: true,
      translation: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (input.sourceId) {
    try {
      await db.vocabularyOccurrence.create({
        data: {
          vocabularyItemId: item.id,
          sourceId: input.sourceId,
          selectedText: input.selectedText,
          contextSentence: input.contextSentence ?? null,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Duplicate occurrence — safe to ignore
      } else {
        throw error;
      }
    }
  }

  return item;
}
