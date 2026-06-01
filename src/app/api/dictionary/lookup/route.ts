import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import {
  getPrismaQueryMetrics,
  runWithPrismaQueryMetrics,
  runWithPrismaQueryStep,
} from "@/lib/observability/prisma-query-metrics";
import {
  createDictionaryPerformanceTracker,
  shouldIncludeDictionaryPerformanceMetrics,
} from "@/lib/dictionary/dictionary-performance";
import { normalizeDictionaryTerm } from "@/lib/dictionary/normalize-dictionary-term";
import { resolveDictionaryLookup } from "@/lib/dictionary/resolve-dictionary-lookup";
import type {
  DictionaryEntryDto,
  DictionaryMissDto,
} from "@/lib/dictionary/dictionary-dtos";

const dictionaryLookupQuerySchema = z.object({
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
    return runWithPrismaQueryMetrics(() => handleDictionaryLookupGet(request, true));
  }

  return handleDictionaryLookupGet(request, false);
}

async function handleDictionaryLookupGet(request: NextRequest, includePerformance: boolean) {
  const routeStartedAt = performance.now();
  const requestLog = createRequestLogger(
    "api:dictionary-lookup",
    createRequestLogContext(request, "GET", "/api/dictionary/lookup"),
  );

  try {
    const { searchParams } = new URL(request.url);
    const raw = {
      q: searchParams.get("q") ?? "",
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = dictionaryLookupQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((i) => i.path.join(".")) } },
        "Invalid dictionary lookup query rejected",
      );
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const normalizedQuery = normalizeDictionaryTerm(parsed.data.q);
    const performanceTracker = includePerformance
      ? createDictionaryPerformanceTracker({
          query: parsed.data.q,
          normalizedQuery,
          phase: "lookup",
          startedAt: routeStartedAt,
        })
      : null;

    const user = await measureDictionaryStep(
      performanceTracker,
      "auth",
      () => Sentry.startSpan(
        { name: "api:dictionary-lookup-authenticate", op: "auth" },
        () => getAuthenticatedUser(),
      ),
    );

    const result = await measureDictionaryStep(
      performanceTracker,
      "lookupResolve",
      () => Sentry.startSpan(
        {
          name: "db:dictionary-lookup",
          op: "db",
          attributes: {
            "dictionary.query_length": parsed.data.q.length,
            "user.id": user.id,
          },
        },
        () =>
          resolveDictionaryLookup(parsed.data.q, {
            sourceLanguage: parsed.data.sourceLanguage,
            targetLanguage: parsed.data.targetLanguage,
          }),
      ),
    ) as DictionaryEntryDto | DictionaryMissDto;

    requestLog.info(
      {
        context: {
          queryLength: parsed.data.q.length,
          found: "found" in result && result.found === false ? false : true,
        },
      },
      "Dictionary lookup completed",
    );

    return createDictionaryLookupSuccessResponse({
      data: result,
      performanceTracker,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Dictionary lookup failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-lookup", method: "GET" },
    });
    return NextResponse.json({ error: "Dictionary lookup failed." }, { status: 500 });
  }
}

function createDictionaryLookupSuccessResponse(input: {
  data: DictionaryEntryDto | DictionaryMissDto;
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

function measureDictionaryStep<T>(
  performanceTracker: ReturnType<typeof createDictionaryPerformanceTracker> | null,
  step: string,
  callback: () => Promise<T>,
) {
  if (!performanceTracker) return callback();
  return performanceTracker.measure(step, () => runWithPrismaQueryStep(step, callback));
}
