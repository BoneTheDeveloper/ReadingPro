import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { updateVocabularyItemStatus } from "@/features/vocabulary/services/vocabulary-items.service";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";

const statusUpdateSchema = z.object({
  status: z.enum(["NEW", "LEARNING", "MASTERED"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:status",
    createRequestLogContext(request, "PATCH", "/api/vocabulary/[id]/status"),
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

    const parsed = statusUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const userId = await getUserId();
    const { id } = await params;

    const dto = await Sentry.startSpan(
      { name: "db:vocabulary-status-update", op: "db" },
      async () =>
        updateVocabularyItemStatus({
          userId: userId,
          itemId: id,
          status: parsed.data.status,
        }),
    );

    return NextResponse.json({ success: true, data: dto });
  } catch (error) {
    return toHttp(error, requestLog, "api:vocabulary:status");
  }
}
