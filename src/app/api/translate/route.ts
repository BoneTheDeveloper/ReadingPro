import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { createRequestLogContext, createRequestLogger } from "@/server/core/logger";
import {
  getPrismaQueryMetrics,
  runWithPrismaQueryMetrics,
} from "@/server/observability/prisma-query-metrics";
import { MAX_TRANSLATE_CONTEXT_LENGTH, MAX_TRANSLATE_TEXT_LENGTH } from "@/shared/translation/translation-limits";
import {
  createTranslatePerformanceTracker,
  shouldIncludeTranslatePerformanceMetrics,
  type TranslatePerformanceSnapshot,
} from "@/shared/translation/translate-performance";
import type { QuickTranslation } from "@/server/ai/translator";
import { executeTranslate } from "@/server/modules/translation/inline/inline-translate.service";

const translateRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TRANSLATE_TEXT_LENGTH),
  context: z.string().trim().min(1).max(MAX_TRANSLATE_CONTEXT_LENGTH),
  sourceId: z.string().uuid(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
  clientMetrics: z.object({
    wordsBeforeSelected: z.number().int().nonnegative().optional(),
  }).optional(),
}).strict();

function isAuthenticationError(error: unknown) {
  return error instanceof Error && error.message === "Authentication required";
}

export async function POST(request: NextRequest) {
  const includePerformance = shouldIncludeTranslatePerformanceMetrics(request.headers);

  if (includePerformance) {
    return runWithPrismaQueryMetrics(() => handlePost(request, true));
  }

  return handlePost(request, false);
}

async function handlePost(request: NextRequest, includePerformance: boolean) {
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

    const result = await executeTranslate(
      {
        text: input.text,
        context: input.context,
        sourceId: input.sourceId,
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
      },
      {
        userId: user.id,
        performanceTracker,
        requestLog: requestLog.child({ userId: user.id }),
      },
    );

    if (!result.ok) {
      return NextResponse.json({ error: "Source not found." }, { status: result.status });
    }

    return createSuccessResponse({
      data: result.data,
      performanceTracker,
      resolutionSource: result.resolutionSource,
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

function createSuccessResponse(input: {
  data: QuickTranslation;
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

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}
