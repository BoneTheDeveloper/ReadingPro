import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserProgress } from "@/features/progress/db/progress-queries";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:progress:stats",
    createRequestLogContext(request, "GET", "/api/progress/stats"),
  );

  try {
    const userId = await getUserId();
    const stats = await Sentry.startSpan(
      { name: "db:progress-stats", op: "db" },
      async () => getUserProgress(userId),
    );

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return toHttp(error, requestLog, "api:progress:stats");
  }
}
