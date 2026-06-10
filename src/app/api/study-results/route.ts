import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import {
  isAuthenticationRequiredError,
  isOwnershipMissError,
} from "@/lib/api/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/lib/core/logger";
import { db } from "@/lib/db/client";
import type { StudioResult } from "@/features/study/study-types";

const studyResultsQuerySchema = z.object({
  passageId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:study-results",
    createRequestLogContext(request, "GET", "/api/study-results"),
  );

  try {
    const { searchParams } = request.nextUrl;
    const parsed = studyResultsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid passageId: must be a valid UUID." },
        { status: 400 },
      );
    }

    const { passageId } = parsed.data;
    const user = await getAuthenticatedUser();

    const passage = await Sentry.startSpan(
      { name: "db:passage-fetch", op: "db" },
      async () =>
        db.passage.findFirst({
          where: {
            id: passageId,
            userId: user.id,
            deletedAt: null,
          },
          select: {
            id: true,
            simplifiedContent: true,
            updatedAt: true,
          },
        }),
    );

    if (!passage) {
      return NextResponse.json(
        { error: "Passage not found." },
        { status: 404 },
      );
    }

    const results: StudioResult[] = [];

    // Check quiz existence via Question table
    const question = await Sentry.startSpan(
      { name: "db:question-exists-check", op: "db" },
      async () =>
        db.question.findFirst({
          where: { passageId },
          select: { createdAt: true },
        }),
    );

    if (question) {
      results.push({
        id: `quiz:${passageId}`,
        type: "quiz",
        passageId,
        title: "Quiz",
        status: "completed",
        createdAt: question.createdAt.toISOString(),
      });
    }

    // Check summary existence via simplifiedContent
    if (passage.simplifiedContent != null) {
      results.push({
        id: `summary:${passageId}`,
        type: "summary",
        passageId,
        title: "Summary",
        status: "completed",
        createdAt: passage.updatedAt.toISOString(),
      });
    }

    requestLog.info(
      { passageId, resultCount: results.length },
      "Study results fetched",
    );

    return NextResponse.json({ results });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      requestLog.warn("Unauthenticated study-results request rejected");
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (isOwnershipMissError(error, ["passage"])) {
      return NextResponse.json(
        { error: "Passage not found." },
        { status: 404 },
      );
    }

    requestLog.error({ err: error }, "Failed to fetch study results");
    Sentry.captureException(error, {
      tags: { route: "api:study-results", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch study results." },
      { status: 500 },
    );
  }
}
