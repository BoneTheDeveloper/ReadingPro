import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { addItemToSet } from "@/lib/db/vocabulary-set-queries";
import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { isAuthenticationRequiredError, isOwnershipMissError } from "@/lib/api/route-errors";
import { createRequestLogContext, createRequestLogger } from "@/lib/core/logger";
import { db } from "@/lib/db/client";

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
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = addItemsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const user = await getAuthenticatedUser();
    const { id } = await params;

    // Verify set ownership
    const set = await db.vocabularySet.findUniqueOrThrow({
      where: { id },
    });
    if (set.userId !== user.id) {
      return NextResponse.json({ error: "Vocabulary set not found." }, { status: 404 });
    }

    await Sentry.startSpan(
      { name: "db:vocabulary-set-add-items", op: "db" },
      async () =>
        Promise.all(
          parsed.data.itemIds.map((itemId) =>
            addItemToSet({ userId: user.id, setId: id, itemId }),
          ),
        ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (isOwnershipMissError(error, ["vocabulary item", "vocabulary"])) {
      return NextResponse.json({ error: "Vocabulary item not found." }, { status: 404 });
    }

    requestLog.error({ err: error }, "Failed to add items to vocabulary set");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:sets:add-items", method: "POST" },
    });
    return NextResponse.json({ error: "Failed to add items to set." }, { status: 500 });
  }
}
