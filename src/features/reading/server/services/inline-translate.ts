import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { moduleLog } from "@/lib/observability/logger";
import type { TranslateResolutionSource } from "@/features/reading/lib/text-utils";
import type { QuickTranslation } from "@/features/dictionary/server/services/lookup-quick";
import {
  buildTranslationCacheKey,
  fetchCacheAndSource,
  writeTranslationCache,
  writeTranslationHistory,
} from "../db/inline-translate";
import { resolveWordTranslate } from "./word-translate";

export interface TranslateServiceInput {
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}

export interface TranslateServiceContext {
  userId: string;
}

const log = moduleLog("reading:translate");

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
    log.warn("Translation source not found");
    return { ok: false, status: 404 };
  }

  if (row.cacheResponse) {
    const cached = row.cacheResponse as unknown as QuickTranslation | null;
    if (cached && typeof cached.translation === "string" && typeof cached.provider === "string") {
      const data = asCacheProvider(cached);
      log.info(
        {
          cacheHit: true,
          provider: data.provider,
          selectedTextLength: input.text.length,
          contextLength: input.context.length,
        },
        "Translation cache hit",
      );

      void persistAsync(ctx.userId, input, data);

      return { ok: true, data, resolutionSource: "cache" };
    }
  }

  const result = await resolveWordTranslate(input);

  if (!result.translation) {
    return { ok: false, status: 404 };
  }

  log.info(
    {
      provider: result.provider,
      selectedTextLength: input.text.length,
      contextLength: input.context.length,
    },
    "Translation resolved",
  );

  void persistAsync(ctx.userId, input, result);

  return {
    ok: true,
    data: result,
    resolutionSource:
      result.provider === "dictionary" ? "dictionary" : "fallback",
  };
}

async function persistAsync(
  userId: string,
  input: TranslateServiceInput,
  result: QuickTranslation,
) {
  try {
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
  } catch (error) {
    log.error({ err: error }, "Failed to persist translation");
  }
}
