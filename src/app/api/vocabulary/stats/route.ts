import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/server/auth/auth-utils";
import { isAuthenticationRequiredError } from "@/server/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/server/observability/logger";
import { getVocabularyStats } from "@/server/db/vocabulary/vocabulary-queries";

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:stats",
    createRequestLogContext(request, "GET", "/api/vocabulary/stats"),
  );

  try {
    const userId = await getUserId();
    const stats = await getVocabularyStats(userId);
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    requestLog.error({ err: error }, "Failed to load vocabulary stats");
    return NextResponse.json(
      { error: "Failed to load vocabulary stats." },
      { status: 500 },
    );
  }
}
