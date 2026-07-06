import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/server/auth/auth-utils";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/server/observability/logger";
import { getVocabularyItemStats } from "@/server/modules/vocabulary/items/vocabulary-items.service";

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:stats",
    createRequestLogContext(request, "GET", "/api/vocabulary/stats"),
  );

  try {
    const userId = await getUserId();
    const stats = await getVocabularyItemStats(userId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    requestLog.error({ err: error }, "Failed to load vocabulary stats");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:stats", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to load vocabulary stats." },
      { status: 500 },
    );
  }
}
