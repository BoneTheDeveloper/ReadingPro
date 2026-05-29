import type { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import {
  detailedTranslationSchema,
  generateDetailedAiTranslation,
  generateQuickAiTranslation,
  quickTranslationSchema,
  type DetailedTranslation,
  type QuickTranslation,
} from "@/lib/ai/translator";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import { lookupDictionaryTranslation } from "@/lib/dictionary/translation-dictionary";
import {
  buildTranslationCacheKey,
  createTranslationHistory,
  getOwnedTranslationSource,
  getTranslationCache,
  upsertTranslationCache,
} from "@/lib/db/translation-queries";

const DICTIONARY_CONFIDENCE_THRESHOLD = 0.8;

const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(500),
  context: z.string().trim().min(1).max(4000),
  sourceId: z.string().min(1),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  mode: z.enum(["quick", "detailed"]),
});

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
  let requestLog = createRequestLogger(
    "api:translate",
    createRequestLogContext(request, "POST", "/api/translate"),
  );

  try {
    let body: unknown;
    try {
      body = await Sentry.startSpan(
        { name: "api:translate-parse-body", op: "http.server" },
        () => request.json(),
      );
    } catch {
      requestLog.warn("Invalid JSON payload received for translation");
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = translateRequestSchema.safeParse(body);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((issue) => issue.path.join(".")) } },
        "Invalid translation request rejected",
      );
      return NextResponse.json({ error: "Invalid translation request." }, { status: 400 });
    }

    const input = parsed.data;
    requestLog = requestLog.child({
      sourceId: input.sourceId,
      mode: input.mode,
      targetLanguage: input.targetLanguage,
    });

    const user = await Sentry.startSpan(
      {
        name: "api:translate-authenticate",
        op: "auth",
        attributes: { "translation.source_id": input.sourceId },
      },
      () => getAuthenticatedUser(),
    );
    requestLog = requestLog.child({ userId: user.id });

    const source = await Sentry.startSpan(
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
    );

    if (!source) {
      requestLog.warn("Translation source not found");
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    const cacheKey = buildTranslationCacheKey({
      userId: user.id,
      sourceId: input.sourceId,
      selectedText: input.text,
      contextSentence: input.context,
      targetLanguage: input.targetLanguage,
      mode: input.mode,
    });

    const cached = await Sentry.startSpan(
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
    );

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

        await persistTranslationResult(user.id, input, result);
        return NextResponse.json({ success: true, data: result });
      }
    }

    const result =
      input.mode === "quick"
        ? await resolveQuickTranslation(input, user.id, requestLog)
        : await Sentry.startSpan(
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
          );

    await Sentry.startSpan(
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
    );
    await persistTranslationResult(user.id, input, result);

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

    return NextResponse.json({ success: true, data: result });
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
  input: z.infer<typeof translateRequestSchema>,
  userId: string,
  requestLog: ReturnType<typeof createRequestLogger>,
): Promise<QuickTranslation> {
  const dictionaryResult = await Sentry.startSpan(
    {
      name: "dictionary:translate-lookup",
      op: "function",
      attributes: {
        "translation.source_id": input.sourceId,
        "translation.text_length": input.text.length,
        "translation.context_length": input.context.length,
        "translation.target_language": input.targetLanguage,
        "user.id": userId,
      },
    },
    () => lookupDictionaryTranslation(input),
  );

  if (dictionaryResult && dictionaryResult.confidence >= DICTIONARY_CONFIDENCE_THRESHOLD) {
    requestLog.info(
      {
        context: {
          dictionaryHit: true,
          dictionaryConfidence: dictionaryResult.confidence,
          provider: "dictionary",
        },
      },
      "Dictionary translation selected",
    );
    return {
      translation: dictionaryResult.translation,
      type: dictionaryResult.type ?? null,
      provider: "dictionary",
    };
  }

  requestLog.info(
    {
      context: {
        dictionaryHit: Boolean(dictionaryResult),
        dictionaryConfidence: dictionaryResult?.confidence,
        provider: "ai",
      },
    },
    "Dictionary translation missed or low confidence; falling back to AI",
  );

  return Sentry.startSpan(
    {
      name: "ai:translate-generate",
      op: "ai",
      attributes: {
        "translation.mode": input.mode,
        "translation.source_id": input.sourceId,
        "translation.text_length": input.text.length,
        "translation.context_length": input.context.length,
        "user.id": userId,
      },
    },
    () => generateQuickAiTranslation(input),
  );
}

async function persistTranslationResult(
  userId: string,
  input: z.infer<typeof translateRequestSchema>,
  result: QuickTranslation | DetailedTranslation,
) {
  await Sentry.startSpan(
    {
      name: "db:translate-history-create",
      op: "db",
      attributes: {
        "db.operation": "create",
        "db.model": "TranslationHistory",
        "translation.provider": result.provider,
        "translation.source_id": input.sourceId,
        "user.id": userId,
      },
    },
    () =>
      createTranslationHistory({
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
      }),
  );
}
