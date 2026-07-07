import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { addItemsToVocabularySet } from "@/features/vocabulary/services/vocabulary-sets.service";
import { getUserId } from "@/services/clerk";
import { toHttp } from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";

const addItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets:add-items",
    createRequestLogContext(request, "POST", "/api/vocabulary/sets/[id]/items"),
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

    const parsed = addItemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const userId = await getUserId();
    const { id } = await params;

    await Sentry.startSpan(
      { name: "db:vocabulary-set-add-items", op: "db" },
      async () =>
        addItemsToVocabularySet({
          userId: userId,
          setId: id,
          itemIds: parsed.data.itemIds,
        }),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return toHttp(error, requestLog, "api:vocabulary:sets:add-items");
  }
}
