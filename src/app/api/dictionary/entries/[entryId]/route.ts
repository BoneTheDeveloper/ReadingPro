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
import { findEntryById } from "@/lib/db/dictionary-queries";
import { buildEntryDto } from "@/lib/dictionary/resolve-dictionary-lookup";
import { RUNTIME_STATUSES } from "@/lib/dictionary/dictionary-dtos";

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

    if (!entryId || entryId.trim().length === 0) {
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

    await measureDictionaryStep(
      performanceTracker,
      "auth",
      () => Sentry.startSpan(
        { name: "api:dictionary-entry-detail-authenticate", op: "auth" },
        () => getAuthenticatedUser(),
      ),
    );

    const entry = await measureDictionaryStep(
      performanceTracker,
      "entryDetailResolve",
      () => Sentry.startSpan(
        {
          name: "db:dictionary-entry-detail",
          op: "db",
          attributes: { "dictionary.entry_id": entryId },
        },
        () => findEntryById(entryId, parsed.data.sourceLanguage, parsed.data.targetLanguage),
      ),
    );

    if (!entry) {
      requestLog.info(
        { context: { entryId } },
        "Dictionary entry not found",
      );
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }

    const dto = buildEntryDto(entry, parsed.data.targetLanguage, RUNTIME_STATUSES);

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
  data: ReturnType<typeof buildEntryDto>;
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
