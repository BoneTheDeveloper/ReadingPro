import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { createRequestLogger } from "@/services/logger";
import type { TranslateResolutionSource } from "@/features/reading/lib/text-utils";
import { quickTranslationSchema, type QuickTranslation } from "@/features/dictionary/services/lookup-quick.service";
import {
  buildTranslationCacheKey,
  fetchCacheAndSource,
  writeTranslationCache,
  writeTranslationHistory,
} from "../db/inline-translate.repository";
import { resolveWordTranslate } from "../db/word-translate";

export interface TranslateServiceInput {
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}

type RequestLogger = ReturnType<typeof createRequestLogger>;

export interface TranslateServiceContext {
  userId: string;
  requestLog: RequestLogger;
}

export type TranslateResult =
  | {
      ok: true;
      data: QuickTranslation;
      resolutionSource: TranslateResolutionSource;
    }
  | { ok: false; status: 404 };

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asCacheProvider(value: QuickTranslation): QuickTranslation {
  return { ...value, provider: "cache" };
}

export async function executeTranslate(
  input: TranslateServiceInput,
  ctx: TranslateServiceContext,
): Promise<TranslateResult> {
  const cacheKey = buildTranslationCacheKey({
    userId: ctx.userId,
    sourceId: input.sourceId,
    selectedText: input.text,
    contextSentence: input.context,
    targetLanguage: input.targetLanguage,
  });

  const rows = await fetchCacheAndSource(cacheKey, ctx.userId, input.sourceId);

  const row = rows[0];

  if (!row?.sourceId) {
    ctx.requestLog.warn("Translation source not found");
    return { ok: false, status: 404 };
  }

  if (row.cacheResponse) {
    const cachedResult = quickTranslationSchema.safeParse(row.cacheResponse);
    if (cachedResult.success) {
      const data = asCacheProvider(cachedResult.data);
      ctx.requestLog.info(
        {
          context: {
            cacheHit: true,
            provider: data.provider,
            selectedTextLength: input.text.length,
            contextLength: input.context.length,
          },
        },
        "Translation cache hit",
      );

      void persistAsync(ctx.userId, input, data, ctx.requestLog);

      return { ok: true, data, resolutionSource: "cache" };
    }
  }

  const result = await resolveWordTranslate(input, ctx);

  if (!result.translation) {
    return { ok: false, status: 404 };
  }

  ctx.requestLog.info(
    {
      context: {
        provider: result.provider,
        selectedTextLength: input.text.length,
        contextLength: input.context.length,
      },
    },
    "Translation resolved",
  );

  void persistAsync(ctx.userId, input, result, ctx.requestLog);

  return {
    ok: true,
    data: result,
    resolutionSource: result.provider === "dictionary" ? "dictionary" : "fallback",
  };
}

async function persistAsync(
  userId: string,
  input: TranslateServiceInput,
  result: QuickTranslation,
  requestLog: RequestLogger,
) {
  try {
    await Sentry.startSpan(
      { name: "translation:persist", op: "db" },
      async () => {
        await Promise.all([
          writeTranslationCache({
            userId,
            sourceId: input.sourceId,
            selectedText: input.text,
            contextSentence: input.context,
            sourceLanguage: input.sourceLanguage,
            targetLanguage: input.targetLanguage,
            provider: result.provider,
            response: toJsonValue(result),
          }),
          writeTranslationHistory({
            userId,
            sourceId: input.sourceId,
            selectedText: input.text,
            contextSentence: input.context,
            sourceLanguage: input.sourceLanguage,
            targetLanguage: input.targetLanguage,
            provider: result.provider,
            translation: result.translation,
            response: toJsonValue(result),
          }),
        ]);
      },
    );
  } catch (error) {
    requestLog.error({ err: error }, "Failed to persist translation");
  }
}
