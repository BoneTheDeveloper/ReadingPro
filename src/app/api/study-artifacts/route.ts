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
import { fetchStudioArtifacts } from "@/lib/study/passage/studio-artifacts-service";

const studyArtifactsQuerySchema = z.object({
  passageId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:study-artifacts",
    createRequestLogContext(request, "GET", "/api/study-artifacts"),
  );

  try {
    const { searchParams } = request.nextUrl;
    const parsed = studyArtifactsQuerySchema.safeParse(
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

    const { artifacts } = await Sentry.startSpan(
      { name: "study:fetch-artifacts", op: "db" },
      async () => fetchStudioArtifacts(user.id, passageId),
    );

    requestLog.info(
      { passageId, artifactCount: artifacts.length },
      "Study artifacts fetched",
    );

    return NextResponse.json({
      success: true,
      data: { artifacts },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      requestLog.warn("Unauthenticated study-artifacts request rejected");
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

    requestLog.error({ err: error }, "Failed to fetch study artifacts");
    Sentry.captureException(error, {
      tags: { route: "api:study-artifacts", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch study artifacts." },
      { status: 500 },
    );
  }
}
