import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import {
  renameVocabularySet,
  deleteVocabularySetById,
} from "@/features/vocabulary/services/sets/vocabulary-sets.service";
import { getUserId } from "@/services/clerk";
import {
  isAuthenticationRequiredError,
  isOwnershipMissError,
} from "@/lib/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/services/logger";

const renameSetSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets:update",
    createRequestLogContext(request, "PATCH", "/api/vocabulary/sets/[id]"),
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

    const parsed = renameSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const userId = await getUserId();
    const { id } = await params;

    const set = await Sentry.startSpan(
      { name: "db:vocabulary-set-update", op: "db" },
      async () =>
        renameVocabularySet({
          userId: userId,
          setId: id,
          name: parsed.data.name,
        }),
    );

    return NextResponse.json({ success: true, data: set });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (isOwnershipMissError(error, ["vocabulary set", "set"])) {
      return NextResponse.json(
        { error: "Vocabulary set not found." },
        { status: 404 },
      );
    }

    requestLog.error({ err: error }, "Failed to update vocabulary set");
    Sentry.captureException(error, {
      tags: { route: "api:vocabulary:sets:update", method: "PATCH" },
    });
    return NextResponse.json(
      { error: "Failed to update vocabulary set." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:sets:delete",
    createRequestLogContext(request, "DELETE", "/api/vocabulary/sets/[id]"),
  );

  try {
    const userId = await getUserId();
    const { id } = await params;

    await deleteVocabularySetById({ userId: userId, setId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthenticationRequiredError(error)) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    if (isOwnershipMissError(error, ["vocabulary set", "set"])) {
      return NextResponse.json(
        { error: "Vocabulary set not found." },
        { status: 404 },
      );
    }

    requestLog.error({ err: error }, "Failed to delete vocabulary set");
    return NextResponse.json(
      { error: "Failed to delete vocabulary set." },
      { status: 500 },
    );
  }
}
