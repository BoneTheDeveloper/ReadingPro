import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { getVocabularyItemStats } from "@/features/vocabulary/services/vocabulary-items.service";

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
    return toHttp(error, requestLog, "api:vocabulary:stats");
  }
}
