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
import { fetchStudyResults } from "@/lib/study/passage/study-results-service";

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

    const { results } = await Sentry.startSpan(
      { name: "study:fetch-results", op: "db" },
      async () => fetchStudyResults(user.id, passageId),
    );

    requestLog.info(
      { passageId, resultCount: results.length },
      "Study results fetched",
    );

    return NextResponse.json({
      success: true,
      data: { results },
    });
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
