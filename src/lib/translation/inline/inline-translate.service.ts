import type { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import type { QuickTranslation } from "@/lib/ai/translator";
import { quickTranslationSchema } from "@/lib/ai/translator";
import { createRequestLogger } from "@/lib/core/logger";
import { getQuickSelectionScope } from "@/lib/translation/quick-selection-scope";
import type {
  TranslatePerformanceSnapshot,
} from "@/lib/translation/translate-performance";
import {
  createTranslatePerformanceTracker,
  getTranslateResolutionSource,
} from "@/lib/translation/translate-performance";
import { runWithPrismaQueryStep } from "@/lib/observability/prisma-query-metrics";
import {
  buildTranslationCacheKey,
  fetchOwnedSource,
  fetchTranslationCache,
  writeTranslationCache,
  writeTranslationHistory,
} from "./inline-translate.repository";
import { resolveWordTranslate } from "./word-translate";
import { resolveSentenceTranslate } from "./sentence-translate";

export interface TranslateServiceInput {
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
}

type RequestLogger = ReturnType<typeof createRequestLogger>;
type PerformanceTracker = ReturnType<typeof createTranslatePerformanceTracker> | null;

export interface TranslateServiceContext {
  userId: string;
  performanceTracker: PerformanceTracker;
  requestLog: RequestLogger;
}

export type TranslateResult =
  | { ok: true; data: QuickTranslation; resolutionSource: TranslatePerformanceSnapshot["resolutionSource"] }
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

  const cached = await measureStep(ctx, "cacheRead", () => fetchTranslationCache(cacheKey));

  if (cached) {
    const cachedResult = quickTranslationSchema.safeParse(cached.response);
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

      void persistTranslationResult(ctx.userId, input, data, ctx.requestLog);

      return { ok: true, data, resolutionSource: "cache" };
    }
  }

  const source = await measureStep(ctx, "sourceFetch", () => fetchOwnedSource(ctx.userId, input.sourceId));

  if (!source) {
    ctx.requestLog.warn("Translation source not found");
    return { ok: false, status: 404 };
  }

  const result = await resolveTranslate(input, ctx);

  await measureStep(ctx, "cacheWrite", () =>
    writeTranslationCache({
      userId: ctx.userId,
      sourceId: input.sourceId,
      selectedText: input.text,
      contextSentence: input.context,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      provider: result.provider,
      response: toJsonValue(result),
    }),
  );

  void persistTranslationResult(ctx.userId, input, result, ctx.requestLog);

  ctx.requestLog.info(
    {
      context: {
        cacheHit: false,
        provider: result.provider,
        selectedTextLength: input.text.length,
        contextLength: input.context.length,
      },
    },
    "Translation request completed",
  );

  return {
    ok: true,
    data: result,
    resolutionSource: getTranslateResolutionSource({
      provider: result.provider,
      selectedText: input.text,
    }),
  };
}

function resolveTranslate(
  input: TranslateServiceInput,
  ctx: TranslateServiceContext,
): Promise<QuickTranslation> {
  const scope = getQuickSelectionScope(input.text);
  return scope === "dictionary"
    ? resolveWordTranslate(input, ctx)
    : resolveSentenceTranslate(input, ctx);
}

async function persistTranslationResult(
  userId: string,
  input: TranslateServiceInput,
  result: QuickTranslation,
  requestLog: ReturnType<typeof createRequestLogger>,
) {
  try {
    await writeTranslationHistory({
      userId,
      sourceId: input.sourceId,
      selectedText: input.text,
      contextSentence: input.context,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      provider: result.provider,
      translation: result.translation,
      response: toJsonValue(result),
    });
  } catch (error) {
    requestLog.warn({ err: error }, "Failed to persist translation history");
    Sentry.captureException(error, {
      tags: { route: "api:translate", component: "historyCreate" },
      level: "warning",
    });
  }
}

async function measureStep<T>(
  ctx: TranslateServiceContext,
  step: string,
  callback: () => Promise<T>,
): Promise<T> {
  if (!ctx.performanceTracker) return callback();
  return ctx.performanceTracker.measure(step, () => runWithPrismaQueryStep(step, callback));
}
