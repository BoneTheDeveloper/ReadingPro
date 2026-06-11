import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/lib/core/logger";
import { listVocabularyItems } from "@/lib/db/vocabulary-queries";
import { isAuthenticationRequiredError } from "@/lib/api/route-errors";

const vocabularyListQuerySchema = z.object({
  status: z.enum(["NEW", "LEARNING", "MASTERED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const requestLog = createRequestLogger(
    "api:vocabulary:list",
    createRequestLogContext(request, "GET", "/api/vocabulary/list"),
  );

  try {
    const user = await getAuthenticatedUser();

    const { searchParams } = new URL(request.url);
    const parsed = vocabularyListQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { status, search, page, pageSize } = parsed.data;

    const result = await Sentry.startSpan(
      { name: "db:vocabulary-list", op: "db" },
      async () =>
        listVocabularyItems({ userId: user.id, status, search, page, pageSize }),
    );

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
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:list", method: "GET" },
    });
    return NextResponse.json({ error: "Failed to list vocabulary items." }, { status: 500 });
  }
}
