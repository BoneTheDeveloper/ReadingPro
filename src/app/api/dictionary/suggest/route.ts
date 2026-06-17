import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/server/observability/logger";
import {
  getPrismaQueryMetrics,
  runWithPrismaQueryMetrics,
} from "@/server/observability/prisma-query-metrics";
import {
  createDictionaryPerformanceTracker,
  measureDictionaryStep,
  shouldIncludeDictionaryPerformanceMetrics,
} from "@/server/modules/dictionary/shared/dictionary-performance";
import { normalizeDictionaryTerm } from "@/contracts/dictionary/normalize-dictionary-term";
import { suggestDictionaryTerms } from "@/server/modules/dictionary/suggest/suggest.service";
import type { DictionarySuggestItemDto } from "@/contracts/dictionary/dictionary-dtos";

const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const includePerformance = shouldIncludeDictionaryPerformanceMetrics(request.headers);
  if (includePerformance) {
    return runWithPrismaQueryMetrics(() => handleSuggestGet(request, true));
  }

  return handleSuggestGet(request, false);
}

async function handleSuggestGet(request: NextRequest, includePerformance: boolean) {
  const routeStartedAt = performance.now();
  const requestLog = createRequestLogger(
    "api:dictionary-suggest",
    createRequestLogContext(request, "GET", "/api/dictionary/suggest"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = suggestQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn("Invalid suggest query rejected");
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);
    const performanceTracker = includePerformance
      ? createDictionaryPerformanceTracker({
          query: parsed.data.q,
          normalizedQuery,
          phase: "suggest",
          startedAt: routeStartedAt,
        })
      : null;

    if (normalizedQuery.length < 2) {
      return createSuggestSuccessResponse({
        data: [],
        performanceTracker,
      });
    }

    const user = await measureDictionaryStep(
      performanceTracker,
      "auth",
      () => Sentry.startSpan(
        { name: "api:dictionary-suggest-auth", op: "auth" },
        () => getAuthenticatedUser(),
      ),
    );

    const merged = await measureDictionaryStep(
      performanceTracker,
      "suggestResolve",
      () => Sentry.startSpan(
        {
          name: "db:dictionary-suggest",
          op: "db",
          attributes: {
            "dictionary.query_length": normalizedQuery.length,
            "user.id": user.id,
          },
        },
        () => suggestDictionaryTerms(parsed.data.q, {
          sourceLanguage: parsed.data.sourceLanguage,
          targetLanguage: parsed.data.targetLanguage,
        }),
      ),
    );

    requestLog.info(
      {
        context: {
          queryLength: normalizedQuery.length,
          mergedCount: merged.length,
        },
      },
      "Dictionary suggest completed",
    );

    return createSuggestSuccessResponse({
      data: merged,
      performanceTracker,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Dictionary suggest failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-suggest", method: "GET" },
    });
    return NextResponse.json({ error: "Suggest failed." }, { status: 500 });
  }
}

function createSuggestSuccessResponse(input: {
  data: DictionarySuggestItemDto[];
  performanceTracker: ReturnType<typeof createDictionaryPerformanceTracker> | null;
}) {
  if (!input.performanceTracker) {
    return NextResponse.json({ success: true, data: input.data });
  }

  return NextResponse.json({
    success: true,
    data: input.data,
    performance: input.performanceTracker.snapshot(
      getPrismaQueryMetrics() ?? { queryCount: 0, totalDurationMs: 0, steps: {} },
    ),
  });
}
