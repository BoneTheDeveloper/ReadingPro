import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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


export async function upsertTranslationCache(input: TranslationCacheInput) {
  const cacheKey = buildTranslationCacheKey(input);

  return prisma.translationCache.upsert({
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
  return prisma.translationHistory.create({
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
