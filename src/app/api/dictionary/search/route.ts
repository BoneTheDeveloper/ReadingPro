import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/server/auth/auth-utils";
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
import { searchDictionary } from "@/server/modules/dictionary/search/search.service";
import type { DictionarySearchResultDto } from "@/contracts/dictionary/dictionary-dtos";

const dictionarySearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(request: NextRequest) {
  const includePerformance = shouldIncludeDictionaryPerformanceMetrics(request.headers);
  if (includePerformance) {
    return runWithPrismaQueryMetrics(() => handleDictionarySearchGet(request, true));
  }

  return handleDictionarySearchGet(request, false);
}

async function handleDictionarySearchGet(request: NextRequest, includePerformance: boolean) {
  const routeStartedAt = performance.now();
  const requestLog = createRequestLogger(
    "api:dictionary-search",
    createRequestLogContext(request, "GET", "/api/dictionary/search"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = dictionarySearchQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((i) => i.path.join(".")) } },
        "Invalid dictionary search query rejected",
      );
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);
    const performanceTracker = includePerformance
      ? createDictionaryPerformanceTracker({
          query: parsed.data.q,
          normalizedQuery,
          phase: "search",
          startedAt: routeStartedAt,
        })
      : null;

    const userId = await measureDictionaryStep(
      performanceTracker,
      "auth",
      () => Sentry.startSpan(
        { name: "api:dictionary-search-authenticate", op: "auth" },
        () => getUserId(),
      ),
    );

    const results = await measureDictionaryStep(
      performanceTracker,
      "searchResolve",
      () => Sentry.startSpan(
        {
          name: "db:dictionary-search",
          op: "db",
          attributes: {
            "dictionary.query_length": normalizedQuery.length,
            "userId": userId,
          },
        },
        () => searchDictionary(parsed.data.q, {
          sourceLanguage: parsed.data.sourceLanguage,
          targetLanguage: parsed.data.targetLanguage,
          limit: parsed.data.limit,
        }),
      ),
    ) as DictionarySearchResultDto[];

    requestLog.info(
      {
        context: {
          queryLength: normalizedQuery.length,
          resultCount: results.length,
        },
      },
      "Dictionary search completed",
    );

    return createSearchSuccessResponse({
      data: results,
      performanceTracker,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Dictionary search failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-search", method: "GET" },
    });
    return NextResponse.json({ error: "Dictionary search failed." }, { status: 500 });
  }
}

function createSearchSuccessResponse(input: {
  data: DictionarySearchResultDto[];
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
