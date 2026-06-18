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
import { getDictionaryEntryDetail } from "@/server/modules/dictionary/entry-detail/entry-detail.service";
import type { DictionaryEntryDto } from "@/contracts/dictionary/dictionary-dtos";

const entryIdSchema = z.string().uuid();

const entryDetailQuerySchema = z.object({
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const includePerformance = shouldIncludeDictionaryPerformanceMetrics(request.headers);
  if (includePerformance) {
    return runWithPrismaQueryMetrics(() => handleEntryDetailGet(request, params, true));
  }

  return handleEntryDetailGet(request, params, false);
}

async function handleEntryDetailGet(
  request: NextRequest,
  params: Promise<{ entryId: string }>,
  includePerformance: boolean,
) {
  const routeStartedAt = performance.now();
  const requestLog = createRequestLogger(
    "api:dictionary-entry-detail",
    createRequestLogContext(request, "GET", "/api/dictionary/entries/:entryId"),
  );

  try {
    const { entryId } = await params;

    const idParsed = entryIdSchema.safeParse(entryId);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid entry id." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const raw = {
      sourceLanguage: searchParams.get("sourceLanguage") ?? "en",
      targetLanguage: searchParams.get("targetLanguage") ?? "vi",
    };

    const parsed = entryDetailQuerySchema.safeParse(raw);
    if (!parsed.success) {
      requestLog.warn(
        { context: { issues: parsed.error.issues.map((i) => i.path.join(".")) } },
        "Invalid entry detail query rejected",
      );
      return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 });
    }

    const performanceTracker = includePerformance
      ? createDictionaryPerformanceTracker({
          query: entryId,
          normalizedQuery: entryId,
          phase: "entry-detail",
          startedAt: routeStartedAt,
        })
      : null;

    const userId = await measureDictionaryStep(
      performanceTracker,
      "auth",
      () => Sentry.startSpan(
        { name: "api:dictionary-entry-detail-authenticate", op: "auth" },
        () => getUserId(),
      ),
    );

    const dto = await measureDictionaryStep(
      performanceTracker,
      "entryDetailResolve",
      () => Sentry.startSpan(
        {
          name: "db:dictionary-entry-detail",
          op: "db",
          attributes: { "dictionary.entry_id": entryId, "userId": userId },
        },
        () => getDictionaryEntryDetail(entryId, {
          sourceLanguage: parsed.data.sourceLanguage,
          targetLanguage: parsed.data.targetLanguage,
        }),
      ),
    );

    if (!dto) {
      requestLog.info(
        { context: { entryId } },
        "Dictionary entry not found",
      );
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    requestLog.info(
      { context: { entryId, found: true } },
      "Dictionary entry detail completed",
    );

    return createEntryDetailSuccessResponse({
      data: dto,
      performanceTracker,
    });
  } catch (error) {
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Dictionary entry detail failed");
    Sentry.captureException(error, {
      tags: { route: "api:dictionary-entry-detail", method: "GET" },
    });
    return NextResponse.json({ error: "Entry detail failed." }, { status: 500 });
  }
}

function createEntryDetailSuccessResponse(input: {
  data: DictionaryEntryDto;
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
