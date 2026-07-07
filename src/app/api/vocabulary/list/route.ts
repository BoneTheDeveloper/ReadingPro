import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getUserId } from "@/services/clerk";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";
import { toHttp } from "@/lib/http/route-errors";
import { getVocabularyItemList } from "@/features/vocabulary/services/vocabulary-items.service";

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
    const userId = await getUserId();

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
        getVocabularyItemList({ userId: userId, status, search, page, pageSize }),
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
    return toHttp(error, requestLog, "api:vocabulary:list");
  }
}
