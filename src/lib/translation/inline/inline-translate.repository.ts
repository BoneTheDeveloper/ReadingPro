import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db/client";
import {
  buildTranslationCacheKey,
  createTranslationHistory,
  upsertTranslationCache,
} from "@/lib/db/translation-queries";

export { buildTranslationCacheKey };

export interface CacheAndSourceRow {
  cacheProvider: string | null;
  cacheResponse: Prisma.JsonValue | null;
  sourceId: string | null;
  sourceTitle: string | null;
}

export async function fetchCacheAndSource(cacheKey: string, userId: string, sourceId: string) {
  return Sentry.startSpan(
    {
      name: "db:translate-cache-and-source-fetch",
      op: "db",
      attributes: {
        "db.operation": "queryRaw",
      },
    },
    () =>
      db.$queryRaw<CacheAndSourceRow[]>`
        SELECT
          tc.provider AS "cacheProvider",
          tc.response AS "cacheResponse",
          p.id AS "sourceId",
          p.title AS "sourceTitle"
        FROM passages p
        LEFT JOIN translation_caches tc
          ON tc."cacheKey" = ${cacheKey}
          AND tc."sourceId" = p.id
        WHERE p.id = ${sourceId}
          AND p."userId" = ${userId}
          AND p."deletedAt" IS NULL
        LIMIT 1
      `,
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
