import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "./client";

interface TranslationKeyInput {
  userId: string;
  sourceId: string;
  selectedText: string;
  contextSentence: string;
  targetLanguage: string;
  mode: string;
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
  sourceId: string;
  selectedText: string;
  translation: string;
  contextSentence: string;
  sourceLanguage: string;
  targetLanguage: string;
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
    mode: input.mode,
  });
}

export function buildVocabularyKey(input: Omit<VocabularyInput, "translation" | "sourceLanguage" | "type">) {
  return stableHash({
    userId: input.userId,
    sourceId: input.sourceId,
    selectedText: input.selectedText,
    contextSentence: input.contextSentence,
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
      mode: input.mode,
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
      mode: input.mode,
      provider: input.provider,
      translation: input.translation,
      response: input.response,
    },
  });
}

export async function saveVocabularyItem(input: VocabularyInput) {
  const normalizedKey = buildVocabularyKey(input);

  return db.vocabularyItem.upsert({
    where: { normalizedKey },
    update: {
      translation: input.translation,
      type: input.type,
      contextSentence: input.contextSentence,
    },
    create: {
      normalizedKey,
      userId: input.userId,
      sourceId: input.sourceId,
      selectedText: input.selectedText,
      translation: input.translation,
      contextSentence: input.contextSentence,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      type: input.type,
    },
    select: {
      id: true,
      selectedText: true,
      translation: true,
      type: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
