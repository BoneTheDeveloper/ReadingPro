import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/lib/core/logger";
import { listVocabularyItems } from "@/lib/db/vocabulary-queries";
import { isAuthenticationRequiredError } from "@/lib/api/route-errors";

const VOCABULARY_PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:list",
    createRequestLogContext(request, "GET", "/api/vocabulary/list"),
  );

  try {
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? VOCABULARY_PAGE_SIZE)));

    const result = await listVocabularyItems({
      userId: user.id,
      status,
      search,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: {
        items: result.items,
        total: result.total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    requestLog.error({ err: error }, "Failed to list vocabulary items");
    return NextResponse.json({ error: "Failed to list vocabulary items." }, { status: 500 });
  }
}
