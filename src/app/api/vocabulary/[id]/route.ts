import { NextRequest, NextResponse } from "next/server";
import { deleteVocabularyItem } from "@/server/db/vocabulary/vocabulary-queries";
import { getUserId } from "@/server/auth/auth-utils";
import {
  isAuthenticationRequiredError,
  isOwnershipMissError,
} from "@/server/http/route-errors";
import {
  createRequestLogContext,
  createRequestLogger,
} from "@/server/observability/logger";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestLog = createRequestLogger(
    "api:vocabulary:delete",
    createRequestLogContext(request, "DELETE", "/api/vocabulary/[id]"),
  );

  try {
    const userId = await getUserId();
    const { id } = await params;

    await deleteVocabularyItem({ userId: userId, itemId: id });

    return NextResponse.json({ success: true });
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

    requestLog.error({ err: error }, "Failed to delete vocabulary item");
    return NextResponse.json(
      { error: "Failed to delete vocabulary item." },
      { status: 500 },
    );
  }
}
