import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { reviewVocabularyItemById } from "@/features/vocabulary/services/vocabulary-items.service";
import { getUserId } from "@/services/clerk";
import {
  isAuthenticationRequiredError,
  isOwnershipMissError,
} from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";

const reviewSchema = z.object({
  isCorrect: z.boolean(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const requestLog = createRequestLogger(
    "api:vocabulary:review",
    createRequestLogContext(request, "POST", `/api/vocabulary/${id}/review`),
  );

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload." },
        { status: 400 },
      );
    }

    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const userId = await getUserId();

    const dto = await Sentry.startSpan(
      { name: "db:vocabulary-review", op: "db" },
      async () =>
        reviewVocabularyItemById({
          userId: userId,
          itemId: id,
          isCorrect: parsed.data.isCorrect,
        }),
    );

    return NextResponse.json({ success: true, data: dto });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (isOwnershipMissError(error, ["vocabulary item", "vocabulary"])) {
      return NextResponse.json(
        { error: "Vocabulary item not found." },
        { status: 404 },
      );
    }

    requestLog.error({ err: error }, "Failed to review vocabulary item");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:review", method: "POST" },
    });
    return NextResponse.json(
      { error: "Failed to review vocabulary item." },
      { status: 500 },
    );
  }
}
