import type { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import {
  detailedTranslationSchema,
  generateDetailedAiTranslation,
  quickTranslationSchema,
  type DetailedTranslation,
  type QuickTranslation,
} from "@/lib/ai/translator";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import {
  getPrismaQueryMetrics,
  runWithPrismaQueryMetrics,
  runWithPrismaQueryStep,
} from "@/lib/observability/prisma-query-metrics";
import { resolveQuickDictionaryTranslation } from "@/lib/dictionary/resolve-quick-dictionary-translation";
import { getQuickSelectionScope } from "@/lib/translation/quick-selection-scope";
import { translateWithNonAiProvider } from "@/lib/translation/non-ai-machine-translation-provider";
import { MAX_TRANSLATE_CONTEXT_LENGTH, MAX_TRANSLATE_TEXT_LENGTH } from "@/lib/translation/translation-limits";
import {
  createTranslatePerformanceTracker,
  getTranslateResolutionSource,
  shouldIncludeTranslatePerformanceMetrics,
  type TranslatePerformanceSnapshot,
} from "@/lib/translation/translate-performance";
import {
  buildTranslationCacheKey,
  createTranslationHistory,
  getOwnedTranslationSource,
  getTranslationCache,
  upsertTranslationCache,
} from "@/lib/db/translation-queries";

const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TRANSLATE_TEXT_LENGTH),
  context: z.string().trim().min(1).max(MAX_TRANSLATE_CONTEXT_LENGTH),
  sourceId: z.string().min(1),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  mode: z.enum(["quick", "detailed"]),
  clientMetrics: z.object({
    wordsBeforeSelected: z.number().int().nonnegative().optional(),
  }).optional(),
});

type TranslateRequestInput = z.infer<typeof translateRequestSchema>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseCachedTranslation(mode: "quick" | "detailed", response: unknown) {
  return mode === "quick"
    ? quickTranslationSchema.safeParse(response)
    : detailedTranslationSchema.safeParse(response);
}

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

function asCacheProvider<T extends QuickTranslation | DetailedTranslation>(value: T): T {
  return { ...value, provider: "cache" } as T;
}

export async function POST(request: NextRequest) {
  const includePerformance = shouldIncludeTranslatePerformanceMetrics(request.headers);

  if (includePerformance) {
    return runWithPrismaQueryMetrics(() => handleTranslatePost(request, true));
  }

  return handleTranslatePost(request, false);
}

async function handleTranslatePost(request: NextRequest, includePerformance: boolean) {
  const routeStartedAt = performance.now();
  let requestLog = createRequestLogger(
    "api:translate",
    createRequestLogContext(request, "POST", "/api/translate"),
  );
  const initialSteps: Record<string, number> = {};

  try {
    let body: unknown;
    try {
      const parseBodyStartedAt = performance.now();
      body = await Sentry.startSpan(
        { name: "api:translate-parse-body", op: "http.server" },
        () => request.json(),
      );
      initialSteps.parseBody = roundMetric(performance.now() - parseBodyStartedAt);
    } catch {
      requestLog.warn("Invalid JSON payload received for translation");
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const validateStartedAt = performance.now();
    const parsed = translateRequestSchema.safeParse(body);
    initialSteps.validateRequest = roundMetric(performance.now() - validateStartedAt);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((issue) => issue.path.join(".")) } },
        "Invalid translation request rejected",
      );
      return NextResponse.json({ error: "Invalid translation request." }, { status: 400 });
    }

    const input = parsed.data;
    const performanceTracker = includePerformance
      ? createTranslatePerformanceTracker({
          selectedText: input.text,
          context: input.context,
          clientMetrics: input.clientMetrics,
          startedAt: routeStartedAt,
          initialSteps,
        })
      : null;
    requestLog = requestLog.child({
      sourceId: input.sourceId,
      mode: input.mode,
      targetLanguage: input.targetLanguage,
    });

    const user = await measureTranslateStep(performanceTracker, "auth", () => Sentry.startSpan(
      {
        name: "api:translate-authenticate",
        op: "auth",
        attributes: { "translation.source_id": input.sourceId },
      },
      () => getAuthenticatedUser(),
    ));
    requestLog = requestLog.child({ userId: user.id });

    const cacheKey = buildTranslationCacheKey({
      userId: user.id,
      sourceId: input.sourceId,
      selectedText: input.text,
      contextSentence: input.context,
      targetLanguage: input.targetLanguage,
      mode: input.mode,
    });

    const cached = await measureTranslateStep(performanceTracker, "cacheRead", () => Sentry.startSpan(
      {
        name: "db:translate-cache-fetch",
        op: "db",
        attributes: {
          "db.operation": "findUnique",
          "db.model": "TranslationCache",
          "translation.mode": input.mode,
          "translation.source_id": input.sourceId,
          "user.id": user.id,
        },
      },
      () => getTranslationCache(cacheKey),
    ));

    if (cached) {
      const cachedResult = parseCachedTranslation(input.mode, cached.response);
      if (cachedResult.success) {
        const result = asCacheProvider(cachedResult.data);
        requestLog.info(
          {
            context: {
              cacheHit: true,
              provider: result.provider,
              selectedTextLength: input.text.length,
              contextLength: input.context.length,
            },
          },
          "Translation cache hit",
        );

        void persistTranslationResult(user.id, input, result, requestLog);
        return createTranslateSuccessResponse({
          data: result,
          performanceTracker,
          resolutionSource: "cache",
        });
      }
    }

    const source = await measureTranslateStep(performanceTracker, "sourceFetch", () => Sentry.startSpan(
      {
        name: "db:translate-source-fetch",
        op: "db",
        attributes: {
          "db.operation": "findUnique",
          "db.model": "Passage",
          "translation.source_id": input.sourceId,
          "user.id": user.id,
        },
      },
      () => getOwnedTranslationSource(user.id, input.sourceId),
    ));

    if (!source) {
      requestLog.warn("Translation source not found");
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    const result =
      input.mode === "quick"
        ? await resolveQuickTranslation(input, user.id, requestLog, performanceTracker)
        : await measureTranslateStep(performanceTracker, "aiGenerate", () => Sentry.startSpan(
            {
              name: "ai:translate-generate",
              op: "ai",
              attributes: {
                "translation.mode": input.mode,
                "translation.source_id": input.sourceId,
                "translation.text_length": input.text.length,
                "translation.context_length": input.context.length,
                "user.id": user.id,
              },
            },
            () => generateDetailedAiTranslation(input),
          ));

    await measureTranslateStep(performanceTracker, "cacheWrite", () => Sentry.startSpan(
      {
        name: "db:translate-cache-upsert",
        op: "db",
        attributes: {
          "db.operation": "upsert",
          "db.model": "TranslationCache",
          "translation.provider": result.provider,
          "translation.source_id": input.sourceId,
          "user.id": user.id,
        },
      },
      () =>
        upsertTranslationCache({
          userId: user.id,
          sourceId: input.sourceId,
          selectedText: input.text,
          contextSentence: input.context,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
          mode: input.mode,
          provider: result.provider,
          response: toJsonValue(result),
        }),
    ));
    void persistTranslationResult(user.id, input, result, requestLog);

    requestLog.info(
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

    return createTranslateSuccessResponse({
      data: result,
      performanceTracker,
      resolutionSource: getTranslateResolutionSource({
        provider: result.provider,
        selectedText: input.text,
      }),
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      requestLog.warn("Unauthenticated translation request rejected");
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Translation request failed");
    Sentry.captureException(error, {
      tags: { route: "api:translate", method: "POST" },
    });
    return NextResponse.json({ error: "Unable to translate the selection." }, { status: 500 });
  }
}

async function resolveQuickTranslation(
  input: TranslateRequestInput,
  userId: string,
  requestLog: ReturnType<typeof createRequestLogger>,
  performanceTracker: ReturnType<typeof createTranslatePerformanceTracker> | null,
): Promise<QuickTranslation> {
  const scope = getQuickSelectionScope(input.text);

  if (scope === "dictionary") {
    const result = await measureTranslateStep(performanceTracker, "dictionaryResolve", () => Sentry.startSpan(
      {
        name: "dictionary:quick-resolve",
        op: "function",
        attributes: {
          "translation.source_id": input.sourceId,
          "translation.text_length": input.text.length,
          "translation.context_length": input.context.length,
          "translation.target_language": input.targetLanguage,
          "user.id": userId,
        },
      },
      () =>
        resolveQuickDictionaryTranslation({
          text: input.text,
          context: input.context,
          sourceLanguage: input.sourceLanguage,
          targetLanguage: input.targetLanguage,
        }),
    ));

    requestLog.info(
      {
        context: {
          scope,
          provider: result.provider,
          selectedTextLength: input.text.length,
        },
      },
      "Quick dictionary translation resolved",
    );

    return result;
  }

  // Machine scope: non-AI provider for sentence/paragraph
  const providerResult = await measureTranslateStep(performanceTracker, "nonAiProvider", () => Sentry.startSpan(
    {
      name: "translation:non-ai-provider",
      op: "function",
      attributes: {
        "translation.source_id": input.sourceId,
        "translation.text_length": input.text.length,
        "translation.target_language": input.targetLanguage,
        "user.id": userId,
      },
    },
    () =>
      translateWithNonAiProvider({
        text: input.text,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
      }),
  ));

  requestLog.info(
    {
      context: {
        scope,
        provider: providerResult.provider,
        selectedTextLength: input.text.length,
      },
    },
    "Quick machine translation resolved",
  );

  return {
    translation: providerResult.translation,
    type: null,
    provider: providerResult.provider,
  };
}

async function persistTranslationResult(
  userId: string,
  input: TranslateRequestInput,
  result: QuickTranslation | DetailedTranslation,
  requestLog: ReturnType<typeof createRequestLogger>,
) {
  try {
    await createTranslationHistory({
      userId,
      sourceId: input.sourceId,
      selectedText: input.text,
      contextSentence: input.context,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      mode: input.mode,
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

function createTranslateSuccessResponse(input: {
  data: QuickTranslation | DetailedTranslation;
  performanceTracker: ReturnType<typeof createTranslatePerformanceTracker> | null;
  resolutionSource: TranslatePerformanceSnapshot["resolutionSource"];
}) {
  if (!input.performanceTracker) {
    return NextResponse.json({ success: true, data: input.data });
  }

  return NextResponse.json({
    success: true,
    data: input.data,
    performance: input.performanceTracker.snapshot({
      resolutionSource: input.resolutionSource,
      prisma: getPrismaQueryMetrics() ?? { queryCount: 0, totalDurationMs: 0, steps: {} },
    }),
  });
}

function measureTranslateStep<T>(
  performanceTracker: ReturnType<typeof createTranslatePerformanceTracker> | null,
  step: string,
  callback: () => Promise<T>,
) {
  if (!performanceTracker) return callback();
  return performanceTracker.measure(step, () => runWithPrismaQueryStep(step, callback));
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
