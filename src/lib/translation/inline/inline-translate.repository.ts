import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import {
  buildTranslationCacheKey,
  createTranslationHistory,
  getOwnedTranslationSource,
  getTranslationCache,
  upsertTranslationCache,
} from "@/lib/db/translation-queries";

export { buildTranslationCacheKey };

export async function fetchTranslationCache(cacheKey: string) {
  return Sentry.startSpan(
    {
      name: "db:translate-cache-fetch",
      op: "db",
      attributes: {
        "db.operation": "findUnique",
        "db.model": "TranslationCache",
      },
    },
    () => getTranslationCache(cacheKey),
  );
}

export async function writeTranslationCache(input: {
  userId: string;
  sourceId: string;
  selectedText: string;
  contextSentence: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  response: Prisma.InputJsonValue;
}) {
  return Sentry.startSpan(
    {
      name: "db:translate-cache-upsert",
      op: "db",
      attributes: {
        "db.operation": "upsert",
        "db.model": "TranslationCache",
        "translation.provider": input.provider,
      },
    },
    () => upsertTranslationCache(input),
  );
}

export async function fetchOwnedSource(userId: string, sourceId: string) {
  return Sentry.startSpan(
    {
      name: "db:translate-source-fetch",
      op: "db",
      attributes: {
        "db.operation": "findUnique",
        "db.model": "Passage",
        "translation.source_id": sourceId,
        "user.id": userId,
      },
    },
    () => getOwnedTranslationSource(userId, sourceId),
  );
}

export async function writeTranslationHistory(input: {
  userId: string;
  sourceId: string;
  selectedText: string;
  contextSentence: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  translation: string;
  response: Prisma.InputJsonValue;
}) {
  return Sentry.startSpan(
    {
      name: "db:translate-history-create",
      op: "db",
      attributes: {
        "db.operation": "create",
        "db.model": "TranslationHistory",
      },
    },
    () => createTranslationHistory(input),
  );
}
