import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { getUserId } from "@/server/auth/auth-utils";
import {
  isAuthenticationRequiredError,
  isOwnershipMissError,
} from "@/server/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/server/observability/logger";
import { fetchStudioArtifacts } from "@/server/modules/passage/studio-artifacts-service";

const studyArtifactsQuerySchema = z.object({
  passageId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:studio:artifacts",
    createRequestLogContext(request, "GET", "/api/studio/artifacts"),
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
    const userId = await getUserId();

    const { artifacts } = await Sentry.startSpan(
      { name: "study:fetch-artifacts", op: "db" },
      async () => fetchStudioArtifacts(userId, passageId),
    );

    requestLog.info(
      { passageId, artifactCount: artifacts.length },
      "Studio artifacts fetched",
    );

    return NextResponse.json({
      success: true,
      data: { artifacts },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      requestLog.warn("Unauthenticated study artifacts request rejected");
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

    requestLog.error({ err: error }, "Failed to fetch studio artifacts");
    Sentry.captureException(error, {
      tags: { route: "api:study:studio:artifacts", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch studio artifacts." },
      { status: 500 },
    );
  }
}
